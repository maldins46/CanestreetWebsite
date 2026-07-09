import Papa from 'papaparse'
import type { TeamCategory, MatchPhase, BracketRound, MatchWithTeams } from '@/types'
import { parseCsvDateTime, detectCsvDateFormat, toDatetimeLocal, type CsvDateFormat } from './dateRome'

export const REQUIRED_COLUMNS = ['date', 'time', 'home_team', 'away_team', 'round_name', 'category'] as const
export const EXPORT_COLUMNS = [...REQUIRED_COLUMNS, 'home_result', 'away_result'] as const

export interface RawCsvRow {
  rowIndex: number // 1-based, for user-facing messages ("riga 4")
  date: string
  time: string
  home_team: string
  away_team: string
  round_name: string
  category: string
  home_result: string
  away_result: string
}

export interface CsvParseResult {
  rows: RawCsvRow[]
  errors: string[]
}

export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase(),
      complete: results => {
        const errors: string[] = results.errors.map(e => e.message)
        const fields = results.meta.fields ?? []
        const missing = REQUIRED_COLUMNS.filter(c => !fields.includes(c))
        if (missing.length > 0) {
          errors.push(`Colonne mancanti nel CSV: ${missing.join(', ')}`)
          resolve({ rows: [], errors })
          return
        }
        const rows: RawCsvRow[] = results.data.map((r, i) => ({
          rowIndex: i + 1,
          date: r.date ?? '',
          time: r.time ?? '',
          home_team: r.home_team ?? '',
          away_team: r.away_team ?? '',
          round_name: r.round_name ?? '',
          category: r.category ?? '',
          home_result: r.home_result ?? '',
          away_result: r.away_result ?? '',
        }))
        resolve({ rows, errors })
      },
      error: err => resolve({ rows: [], errors: [err.message] }),
    })
  })
}

export function guessDateFormat(rows: RawCsvRow[]): CsvDateFormat {
  const sample = rows.find(r => r.date.trim())?.date ?? ''
  return detectCsvDateFormat(sample)
}

// ------------------------------------------------------------
// Normalization helpers
// ------------------------------------------------------------

export function norm(s: string): string {
  return s.trim().toLocaleLowerCase('it-IT')
}

function fuzzyEquals(a: string, b: string): boolean {
  return norm(a).localeCompare(norm(b), 'it', { sensitivity: 'base' }) === 0
}

// ------------------------------------------------------------
// Category resolution
// ------------------------------------------------------------

// Bare "open" (no gender) is intentionally NOT in this table — it's ambiguous
// between open_m/open_f and must be resolved explicitly via the category picker.
// Explicit gendered variants ("Open M", "Open Maschile", ...) resolve directly.
const CATEGORY_TOKENS: Record<string, TeamCategory> = {
  u18: 'u18_m', u18m: 'u18_m', u18maschile: 'u18_m',
  u16: 'u16_m', u16m: 'u16_m', u16maschile: 'u16_m',
  u14: 'u14_m', u14m: 'u14_m', u14maschile: 'u14_m',
  openm: 'open_m', openmaschile: 'open_m',
  openf: 'open_f', openfemminile: 'open_f',
}

export function resolveCategory(raw: string): TeamCategory | null {
  const key = norm(raw).replace(/[\s_]+/g, '')
  return CATEGORY_TOKENS[key] ?? null
}

// ------------------------------------------------------------
// Score resolution (optional home_result/away_result columns)
// ------------------------------------------------------------

export function resolveScore(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim()
  if (!trimmed) return { value: null, error: null }
  if (!/^\d+$/.test(trimmed)) return { value: null, error: `risultato non valido: "${raw}"` }
  return { value: Number(trimmed), error: null }
}

// ------------------------------------------------------------
// Team resolution
// ------------------------------------------------------------

export type TeamResolutionStatus = 'matched' | 'unmatched' | 'tbd'

export function resolveTeam(
  rawName: string,
  category: TeamCategory | null,
  approvedTeams: { id: string; name: string; category: string }[]
): { teamId: string | null; status: TeamResolutionStatus } {
  const trimmed = rawName.trim()
  if (!trimmed) return { teamId: null, status: 'tbd' }
  if (!category) return { teamId: null, status: 'unmatched' }
  const candidates = approvedTeams.filter(t => t.category === category)
  const exact = candidates.find(t => fuzzyEquals(t.name, trimmed))
  return exact ? { teamId: exact.id, status: 'matched' } : { teamId: null, status: 'unmatched' }
}

// ------------------------------------------------------------
// Round / phase resolution
// ------------------------------------------------------------

const BRACKET_TOKENS: Record<string, BracketRound> = {
  ottavi: 'round_of_16',
  quarti: 'quarterfinal',
  semifinale: 'semifinal',
  semifinali: 'semifinal',
  finale: 'final',
  finali: 'final',
}

export function resolveRound(
  raw: string,
  category: TeamCategory | null,
  allGroups: { id: string; name: string; category: TeamCategory }[]
): { phase: MatchPhase | null; groupId: string | null; bracketRound: BracketRound | null; status: 'matched' | 'unmatched' } {
  const key = norm(raw).replace(/\s+/g, '')
  if (key in BRACKET_TOKENS) {
    return { phase: 'bracket', groupId: null, bracketRound: BRACKET_TOKENS[key], status: 'matched' }
  }
  const groupMatch = raw.trim().match(/^girone\s+(.+)$/i)
  if (groupMatch && category) {
    const label = groupMatch[1]
    const candidates = allGroups.filter(g => g.category === category)
    const exact = candidates.find(g => fuzzyEquals(g.name, label))
    if (exact) return { phase: 'group', groupId: exact.id, bracketRound: null, status: 'matched' }
  }
  return { phase: null, groupId: null, bracketRound: null, status: 'unmatched' }
}

// ------------------------------------------------------------
// Row model
// ------------------------------------------------------------

export type CoherenceCheckId = 'group_membership' | 'time_conflict' | 'duplicate_match' | 'partial_score'

export interface CoherenceWarning {
  check: CoherenceCheckId
  message: string
}

export interface ParsedMatchRow {
  rowIndex: number
  raw: RawCsvRow

  scheduledAt: string | null
  dateError: string | null

  category: TeamCategory | null

  homeTeamId: string | null
  homeTeamStatus: TeamResolutionStatus
  awayTeamId: string | null
  awayTeamStatus: TeamResolutionStatus

  phase: MatchPhase | null
  groupId: string | null
  bracketRound: BracketRound | null
  roundStatus: 'matched' | 'unmatched'

  scoreHome: number | null
  scoreAway: number | null
  scoreError: string | null

  warnings: CoherenceWarning[]
  excluded: boolean
}

export interface ImportContext {
  editionId: string
  editionYear: number
  approvedTeams: { id: string; name: string; category: string }[]
  allGroups: { id: string; name: string; category: TeamCategory }[]
  groupTeams: { group_id: string; team_id: string }[]
  existingMatches: MatchWithTeams[]
}

export function isHardUnresolved(row: ParsedMatchRow): boolean {
  return (
    !row.scheduledAt ||
    !row.category ||
    row.phase === null ||
    row.homeTeamStatus === 'unmatched' ||
    row.awayTeamStatus === 'unmatched' ||
    row.roundStatus === 'unmatched' ||
    Boolean(row.scoreError)
  )
}

export function buildParsedRow(raw: RawCsvRow, dateFormat: CsvDateFormat, ctx: ImportContext): ParsedMatchRow {
  const category = resolveCategory(raw.category)
  const { iso, error } = parseCsvDateTime(raw.date, raw.time, dateFormat, ctx.editionYear)
  const home = resolveTeam(raw.home_team, category, ctx.approvedTeams)
  const away = resolveTeam(raw.away_team, category, ctx.approvedTeams)
  const round = resolveRound(raw.round_name, category, ctx.allGroups)
  const homeScore = resolveScore(raw.home_result)
  const awayScore = resolveScore(raw.away_result)

  return {
    rowIndex: raw.rowIndex,
    raw,
    scheduledAt: iso,
    dateError: error,
    category,
    homeTeamId: home.teamId,
    homeTeamStatus: home.status,
    awayTeamId: away.teamId,
    awayTeamStatus: away.status,
    scoreHome: homeScore.value,
    scoreAway: awayScore.value,
    scoreError: homeScore.error ?? awayScore.error,
    phase: round.phase,
    groupId: round.groupId,
    bracketRound: round.bracketRound,
    roundStatus: round.status,
    warnings: [],
    excluded: false,
  }
}

// ------------------------------------------------------------
// Coherence checks
// ------------------------------------------------------------

function dupKey(r: ParsedMatchRow): string {
  return [r.category, r.phase, r.groupId ?? r.bracketRound ?? '', r.homeTeamId ?? '', r.awayTeamId ?? ''].join('|')
}

export function runCoherenceChecks(rows: ParsedMatchRow[], ctx: ImportContext): ParsedMatchRow[] {
  return rows.map(row => {
    const warnings: CoherenceWarning[] = []

    // (e) partial score — only one of home_result/away_result set
    if ((row.scoreHome != null) !== (row.scoreAway != null)) {
      warnings.push({ check: 'partial_score', message: 'Risultato incompleto: imposta entrambi i punteggi o nessuno' })
    }

    // (b) girone membership
    if (row.phase === 'group' && row.groupId) {
      const sides: Array<['home' | 'away', string | null]> = [
        ['home', row.homeTeamId],
        ['away', row.awayTeamId],
      ]
      for (const [side, teamId] of sides) {
        if (teamId && !ctx.groupTeams.some(gt => gt.group_id === row.groupId && gt.team_id === teamId)) {
          warnings.push({
            check: 'group_membership',
            message: `Squadra ${side === 'home' ? 'casa' : 'ospite'} non fa parte del girone selezionato`,
          })
        }
      }
    }

    // (c) time conflict — same team, same scheduled_at, in batch or existing DB
    if (row.scheduledAt) {
      const teamIds = [row.homeTeamId, row.awayTeamId].filter((x): x is string => Boolean(x))
      for (const other of rows) {
        if (other === row || other.scheduledAt !== row.scheduledAt) continue
        const otherTeamIds = [other.homeTeamId, other.awayTeamId].filter(Boolean)
        if (teamIds.some(id => otherTeamIds.includes(id))) {
          warnings.push({ check: 'time_conflict', message: `Orario duplicato con la riga ${other.rowIndex} (stessa squadra)` })
          break
        }
      }
      for (const existing of ctx.existingMatches) {
        if (existing.scheduled_at !== row.scheduledAt) continue
        const existingTeamIds = [existing.team_home_id, existing.team_away_id].filter(Boolean)
        if (teamIds.some(id => existingTeamIds.includes(id))) {
          warnings.push({ check: 'time_conflict', message: 'Orario già occupato da una partita esistente in calendario' })
          break
        }
      }
    }

    // (d) exact duplicate match — in batch or existing DB
    if (row.category && row.phase && (row.homeTeamId || row.awayTeamId)) {
      const key = dupKey(row)
      if (rows.some(other => other !== row && dupKey(other) === key)) {
        warnings.push({ check: 'duplicate_match', message: 'Partita duplicata nel file CSV' })
      }
      const dupInDb = ctx.existingMatches.some(m =>
        m.category === row.category &&
        m.phase === row.phase &&
        (row.phase === 'group' ? m.group_id === row.groupId : m.bracket_round === row.bracketRound) &&
        m.team_home_id === row.homeTeamId &&
        m.team_away_id === row.awayTeamId
      )
      if (dupInDb) {
        warnings.push({ check: 'duplicate_match', message: 'Partita già presente in calendario' })
      }
    }

    return { ...row, warnings }
  })
}

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------

const EXPORT_BRACKET_LABELS: Record<BracketRound, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinali',
  final: 'Finali',
}

const EXPORT_CATEGORY_LABELS: Record<TeamCategory, string> = {
  open_m: 'Open',
  open_f: 'Open',
  u14_m: 'U14',
  u16_m: 'U16',
  u18_m: 'U18',
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Serializes matches into the same CSV shape the importer expects
 * (date, time, home_team, away_team, round_name, category), plus
 * home_result/away_result columns for the current score.
 */
export function exportMatchesToCsv(matches: MatchWithTeams[]): string {
  const rows = matches.map(m => {
    const local = toDatetimeLocal(m.scheduled_at)
    const [date, time] = local ? local.split('T') : ['', '']
    const roundName =
      m.phase === 'group'
        ? m.group
          ? `Girone ${m.group.name}`
          : ''
        : m.bracket_round
          ? EXPORT_BRACKET_LABELS[m.bracket_round]
          : ''

    return [
      date,
      time,
      m.team_home?.name ?? '',
      m.team_away?.name ?? '',
      roundName,
      EXPORT_CATEGORY_LABELS[m.category],
      m.score_home != null ? String(m.score_home) : '',
      m.score_away != null ? String(m.score_away) : '',
    ]
      .map(escapeCsvCell)
      .join(',')
  })

  return [EXPORT_COLUMNS.join(','), ...rows].join('\r\n')
}

/**
 * Applies default include/exclude state: rows newly flagged (warning or hard-unresolved)
 * default to excluded; rows whose issue clears default back to included. A row's issue
 * state that hasn't changed keeps the user's manual choice.
 */
export function applyDefaultExclusion(prevRows: ParsedMatchRow[], nextRows: ParsedMatchRow[]): ParsedMatchRow[] {
  return nextRows.map((next, i) => {
    const prev = prevRows[i]
    if (!prev) return { ...next, excluded: next.warnings.length > 0 || isHardUnresolved(next) }
    const hadIssue = prev.warnings.length > 0 || isHardUnresolved(prev)
    const hasIssue = next.warnings.length > 0 || isHardUnresolved(next)
    if (!hadIssue && hasIssue) return { ...next, excluded: true }
    if (hadIssue && !hasIssue) return { ...next, excluded: false }
    return { ...next, excluded: prev.excluded }
  })
}
