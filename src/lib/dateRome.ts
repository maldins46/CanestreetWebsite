const ITALIAN_MONTHS: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
}

// JS Date.getDay(): Sunday = 0 .. Saturday = 6
const ITALIAN_WEEKDAYS: Record<string, number> = {
  domenica: 0,
  lunedi: 1,
  'lunedì': 1,
  martedi: 2,
  'martedì': 2,
  mercoledi: 3,
  'mercoledì': 3,
  giovedi: 4,
  'giovedì': 4,
  venerdi: 5,
  'venerdì': 5,
  sabato: 6,
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  // Show Rome local time in the datetime-local input
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16).replace(' ', 'T')
}

export function fromRomeLocal(localStr: string): string | null {
  if (!localStr) return null
  // "YYYY-MM-DDTHH:mm" entered as Rome time → UTC ISO string
  const asIfUtc = new Date(localStr + ':00Z')
  const romeEquiv = asIfUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16)
  const offsetMs = new Date(romeEquiv + ':00Z').getTime() - asIfUtc.getTime()
  return new Date(asIfUtc.getTime() - offsetMs).toISOString()
}

export type CsvDateFormat =
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'DD-MM-YYYY'
  | 'DD Month'
  | 'DayOfWeek DD'

/**
 * Parses a CSV date cell + HH:mm time cell (interpreted as Rome local time)
 * into a UTC ISO string suitable for `matches.scheduled_at`, reusing the same
 * Rome→UTC conversion as the manual "Aggiungi partita" modal.
 */
export function parseCsvDateTime(
  dateStr: string,
  timeStr: string,
  format: CsvDateFormat,
  editionYear: number
): { iso: string | null; error: string | null } {
  const time = timeStr.trim()
  if (!/^\d{2}:\d{2}$/.test(time)) return { iso: null, error: `orario non valido: "${timeStr}"` }

  const s = dateStr.trim()
  let y: number, m: number, d: number

  if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
    const sep = format === 'YYYY-MM-DD' ? '-' : '/'
    const re = new RegExp(`^(\\d{4})\\${sep}(\\d{2})\\${sep}(\\d{2})$`)
    const match = s.match(re)
    if (!match) return { iso: null, error: `data non valida (attesa ${format}): "${dateStr}"` }
    y = Number(match[1])
    m = Number(match[2])
    d = Number(match[3])
  } else if (format === 'DD-MM-YYYY' || format === 'DD/MM/YYYY') {
    const sep = format === 'DD-MM-YYYY' ? '-' : '/'
    const re = new RegExp(`^(\\d{2})\\${sep}(\\d{2})\\${sep}(\\d{4})$`)
    const match = s.match(re)
    if (!match) return { iso: null, error: `data non valida (attesa ${format}): "${dateStr}"` }
    d = Number(match[1])
    m = Number(match[2])
    y = Number(match[3])
  } else if (format === 'DD Month') {
    const match = s.match(/^(\d{1,2})\s+([a-zà-ù]+)$/i)
    if (!match) return { iso: null, error: `data non valida (attesa "DD Mese"): "${dateStr}"` }
    const monthKey = match[2].toLocaleLowerCase('it-IT')
    if (!(monthKey in ITALIAN_MONTHS)) return { iso: null, error: `mese non riconosciuto: "${match[2]}"` }
    y = editionYear
    d = Number(match[1])
    m = ITALIAN_MONTHS[monthKey]
  } else {
    // 'DayOfWeek DD' — e.g. "Lunedì 15": the cell has no month/year at all.
    // Year comes from the edition; month is assumed to be the CURRENT real-world month
    // (only reliable for single-month schedules imported around the time they're played).
    // The stated weekday is cross-checked against the resolved date as a safety net —
    // if it doesn't match, the "current month" assumption was wrong and we bail out
    // rather than silently importing the wrong date.
    const match = s.match(/^([a-zà-ù]+)\s+(\d{1,2})$/i)
    if (!match) return { iso: null, error: `data non valida (attesa "Giorno DD"): "${dateStr}"` }
    const weekdayKey = match[1].toLocaleLowerCase('it-IT')
    if (!(weekdayKey in ITALIAN_WEEKDAYS)) return { iso: null, error: `giorno della settimana non riconosciuto: "${match[1]}"` }
    y = editionYear
    m = new Date().getMonth() + 1
    d = Number(match[2])
    const candidate = new Date(y, m - 1, d)
    if (candidate.getMonth() !== m - 1) return { iso: null, error: `giorno inesistente nel mese corrente: "${dateStr}"` }
    if (candidate.getDay() !== ITALIAN_WEEKDAYS[weekdayKey]) {
      return { iso: null, error: `giorno della settimana non corrisponde al ${d} del mese corrente: "${dateStr}"` }
    }
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return { iso: null, error: `data fuori intervallo: "${dateStr}"` }

  const localStr = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${time}`
  const iso = fromRomeLocal(localStr)
  return { iso, error: iso ? null : `data non valida: "${dateStr}"` }
}

/** Best-effort guess of which CsvDateFormat a raw date cell is written in. */
export function detectCsvDateFormat(sample: string): CsvDateFormat {
  const s = sample.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'YYYY-MM-DD'
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return 'YYYY/MM/DD'
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return 'DD-MM-YYYY'
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return 'DD/MM/YYYY'
  if (/^\d{1,2}\s+[a-zà-ù]+$/i.test(s)) return 'DD Month'
  if (/^[a-zà-ù]+\s+\d{1,2}$/i.test(s)) return 'DayOfWeek DD'
  return 'DD Month'
}
