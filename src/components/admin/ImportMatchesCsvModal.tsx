'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TeamCategory, BracketRound, MatchWithTeams } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import type { CsvDateFormat } from '@/lib/dateRome'
import {
  parseCsvFile,
  guessDateFormat,
  buildParsedRow,
  runCoherenceChecks,
  applyDefaultExclusion,
  isHardUnresolved,
  resolveTeam,
  resolveRound,
  norm,
  EXPORT_COLUMNS,
  type RawCsvRow,
  type ParsedMatchRow,
  type ImportContext,
} from '@/lib/csvMatchImport'
import Modal from './Modal'
import clsx from 'clsx'
import { Upload, X, AlertTriangle, Download } from 'lucide-react'

interface Props {
  onClose: () => void
  editionId: string
  editionYear: number
  approvedTeams: { id: string; name: string; category: string }[]
  allGroups: { id: string; name: string; category: TeamCategory }[]
  groupTeams: { group_id: string; team_id: string }[]
  existingMatches: MatchWithTeams[]
}

type WizardStep = 'upload' | 'preview' | 'done'

const roundLabels: Record<BracketRound, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinale',
  final: 'Finale',
}

const DATE_FORMAT_OPTIONS: { value: CsvDateFormat; label: string }[] = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'DD/MM', label: 'DD/MM' },
  { value: 'DD Month', label: 'DD Mese' },
  { value: 'DayOfWeek DD', label: 'Giorno DD' },
]

export default function ImportMatchesCsvModal({
  onClose,
  editionId,
  editionYear,
  approvedTeams,
  allGroups,
  groupTeams,
  existingMatches,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [step, setStep] = useState<WizardStep>('upload')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<RawCsvRow[]>([])
  const [dateFormat, setDateFormat] = useState<CsvDateFormat>('YYYY-MM-DD')
  const [rows, setRows] = useState<ParsedMatchRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  const ctx: ImportContext = useMemo(
    () => ({ editionId, editionYear, approvedTeams, allGroups, groupTeams, existingMatches }),
    [editionId, editionYear, approvedTeams, allGroups, groupTeams, existingMatches]
  )

  function runPipeline(raw: RawCsvRow[], format: CsvDateFormat, prevRows: ParsedMatchRow[] | null) {
    let next = raw.map(r => buildParsedRow(r, format, ctx))
    next = runCoherenceChecks(next, ctx)
    next = prevRows
      ? applyDefaultExclusion(prevRows, next)
      : next.map(r => ({ ...r, excluded: r.warnings.length > 0 || isHardUnresolved(r) }))
    setRows(next)
  }

  function downloadTemplateCsv() {
    const csv = EXPORT_COLUMNS.join(',') + '\r\n'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modello-partite.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    const { rows: parsed, errors } = await parseCsvFile(file)
    if (errors.length > 0) {
      setUploadError(errors.join('; '))
      return
    }
    if (parsed.length === 0) {
      setUploadError('Il file CSV non contiene righe.')
      return
    }
    const fmt = guessDateFormat(parsed)
    setDateFormat(fmt)
    setRawRows(parsed)
    runPipeline(parsed, fmt, null)
    setStep('preview')
  }

  function handleDateFormatChange(fmt: CsvDateFormat) {
    setDateFormat(fmt)
    runPipeline(rawRows, fmt, rows)
  }

  function updateCategory(rowIndex: number, category: TeamCategory) {
    setRows(prev => {
      const target = prev.find(r => r.rowIndex === rowIndex)
      if (!target) return prev
      const rawCategoryText = norm(target.raw.category)

      function resolveForCategory(r: ParsedMatchRow): ParsedMatchRow {
        const home = resolveTeam(r.raw.home_team, category, approvedTeams)
        const away = resolveTeam(r.raw.away_team, category, approvedTeams)
        const round = resolveRound(r.raw.round_name, category, allGroups)
        return {
          ...r,
          category,
          homeTeamId: home.teamId,
          homeTeamStatus: home.status,
          awayTeamId: away.teamId,
          awayTeamStatus: away.status,
          phase: round.phase,
          groupId: round.groupId,
          bracketRound: round.bracketRound,
          roundStatus: round.status,
        }
      }

      const patched = prev.map(r => {
        if (r.rowIndex === rowIndex) return resolveForCategory(r)
        // propagate to any other row still unresolved with the same raw category text
        if (!r.category && rawCategoryText !== '' && norm(r.raw.category) === rawCategoryText) {
          return resolveForCategory(r)
        }
        return r
      })
      const rechecked = runCoherenceChecks(patched, ctx)
      return applyDefaultExclusion(prev, rechecked)
    })
  }

  function updateTeam(rowIndex: number, side: 'home' | 'away', value: string) {
    setRows(prev => {
      const target = prev.find(r => r.rowIndex === rowIndex)
      if (!target) return prev
      const rawText = norm(side === 'home' ? target.raw.home_team : target.raw.away_team)
      const resolved = value === 'tbd' ? { teamId: null, status: 'tbd' as const } : { teamId: value, status: 'matched' as const }

      const patched = prev.map(r => {
        let next = r
        // apply directly to the edited cell, and propagate to any other still-unmatched
        // cell (either side, any row) showing the exact same unrecognized raw team name
        const applies = (cellSide: 'home' | 'away') => {
          if (r.rowIndex === rowIndex && cellSide === side) return true
          const cellStatus = cellSide === 'home' ? r.homeTeamStatus : r.awayTeamStatus
          const cellRaw = cellSide === 'home' ? r.raw.home_team : r.raw.away_team
          return cellStatus === 'unmatched' && rawText !== '' && r.category === target.category && norm(cellRaw) === rawText
        }
        if (applies('home')) next = { ...next, homeTeamId: resolved.teamId, homeTeamStatus: resolved.status }
        if (applies('away')) next = { ...next, awayTeamId: resolved.teamId, awayTeamStatus: resolved.status }
        return next
      })
      const rechecked = runCoherenceChecks(patched, ctx)
      return applyDefaultExclusion(prev, rechecked)
    })
  }

  function updateRound(rowIndex: number, value: string) {
    setRows(prev => {
      const patched = prev.map(r => {
        if (r.rowIndex !== rowIndex) return r
        if (value.startsWith('group:')) {
          return { ...r, phase: 'group' as const, groupId: value.slice(6), bracketRound: null, roundStatus: 'matched' as const }
        }
        if (value.startsWith('bracket:')) {
          return { ...r, phase: 'bracket' as const, groupId: null, bracketRound: value.slice(8) as BracketRound, roundStatus: 'matched' as const }
        }
        return r
      })
      const rechecked = runCoherenceChecks(patched, ctx)
      return applyDefaultExclusion(prev, rechecked)
    })
  }

  function toggleExclude(rowIndex: number) {
    setRows(prev => prev.map(r => (r.rowIndex === rowIndex ? { ...r, excluded: !r.excluded } : r)))
  }

  async function handleImport() {
    setImporting(true)
    setImportError(null)
    const payloads = rows
      .filter(r => !r.excluded)
      .map(r => ({
        edition_id: editionId,
        category: r.category,
        phase: r.phase,
        group_id: r.phase === 'group' ? r.groupId : null,
        bracket_round: r.phase === 'bracket' ? r.bracketRound : null,
        team_home_id: r.homeTeamId,
        team_away_id: r.awayTeamId,
        scheduled_at: r.scheduledAt,
        score_home: r.scoreHome,
        score_away: r.scoreAway,
        status: r.scoreHome != null && r.scoreAway != null ? 'completed' : 'scheduled',
      }))
    if (payloads.length === 0) {
      setImporting(false)
      return
    }
    const { error } = await supabase.from('matches').insert(payloads)
    if (error) {
      setImportError(error.message)
      setImporting(false)
      return
    }
    setImportedCount(payloads.length)
    setStep('done')
    setImporting(false)
    router.refresh()
  }

  function teamCell(row: ParsedMatchRow, side: 'home' | 'away') {
    const status = side === 'home' ? row.homeTeamStatus : row.awayTeamStatus
    const teamId = side === 'home' ? row.homeTeamId : row.awayTeamId
    const rawText = side === 'home' ? row.raw.home_team : row.raw.away_team

    if (status === 'matched') {
      return <span className="text-court-light">{approvedTeams.find(t => t.id === teamId)?.name}</span>
    }
    if (status === 'tbd') {
      return <span className="opacity-40 italic text-xs">TBD</span>
    }
    const candidates = row.category ? approvedTeams.filter(t => t.category === row.category) : []
    return (
      <select
        defaultValue=""
        onChange={e => updateTeam(row.rowIndex, side, e.target.value)}
        className="input py-1 px-2 text-xs w-full"
      >
        <option value="" disabled>{`"${rawText || '—'}" ?`}</option>
        <option value="tbd">— TBD —</option>
        {candidates.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    )
  }

  function roundCell(row: ParsedMatchRow) {
    if (row.roundStatus === 'matched') {
      if (row.phase === 'group') {
        const g = allGroups.find(g => g.id === row.groupId)
        return <span className="text-court-muted text-xs">Girone {g?.name}</span>
      }
      return <span className="text-court-muted text-xs">{row.bracketRound ? roundLabels[row.bracketRound] : ''}</span>
    }
    const categoryGroups = row.category ? allGroups.filter(g => g.category === row.category) : []
    return (
      <select
        defaultValue=""
        onChange={e => updateRound(row.rowIndex, e.target.value)}
        className="input py-1 px-2 text-xs w-full"
      >
        <option value="" disabled>{`"${row.raw.round_name || '—'}" ?`}</option>
        {categoryGroups.length > 0 && (
          <optgroup label="Gironi">
            {categoryGroups.map(g => (
              <option key={g.id} value={`group:${g.id}`}>Girone {g.name}</option>
            ))}
          </optgroup>
        )}
        <optgroup label="Turni">
          {(Object.keys(roundLabels) as BracketRound[]).map(r => (
            <option key={r} value={`bracket:${r}`}>{roundLabels[r]}</option>
          ))}
        </optgroup>
      </select>
    )
  }

  function categoryCell(row: ParsedMatchRow) {
    if (row.category) {
      return <span className="text-xs">{CATEGORY_LABELS[row.category]}</span>
    }
    return (
      <select
        defaultValue=""
        onChange={e => updateCategory(row.rowIndex, e.target.value as TeamCategory)}
        className="input py-1 px-2 text-xs w-full"
      >
        <option value="" disabled>{`"${row.raw.category || '—'}" ?`}</option>
        {(Object.keys(CATEGORY_LABELS) as TeamCategory[]).map(c => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>
    )
  }

  const includedCount = rows.filter(r => !r.excluded).length
  const hasBlockingRows = rows.some(r => !r.excluded && isHardUnresolved(r))

  return (
    <Modal onClose={onClose} maxWidth={step === 'preview' ? 'max-w-6xl' : 'max-w-md'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold uppercase text-xl text-court-white">Importa partite da CSV</h2>
        <button onClick={onClose} className="text-court-muted hover:text-court-white transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      {step === 'upload' && (
        <div>
          <p className="text-court-gray text-sm mb-1">
            Colonne obbligatorie: <code className="text-court-light">date, time, home_team, away_team, round_name, category</code>. Colonne facoltative: <code className="text-court-light">home_result, away_result</code>.
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1 text-court-gray text-sm mb-4">
            <li><code className="text-court-light">date</code>: il giorno della partita. Il formato viene riconosciuto automaticamente; l&apos;orario deve rispettare <code className="text-court-light">HH:mm</code>.</li>
            <li><code className="text-court-light">home_result</code> / <code className="text-court-light">away_result</code>: risultati della partita, facoltativi. Se valorizzati, la partita viene importata già come terminata con quel risultato.</li>
            <li><code className="text-court-light">round_name</code>: si aspetta il nome del girone (es. Girone A o semplicemente A) o del turno (es. Quarti, Semifinali, Finali).</li>
            <li><code className="text-court-light">category</code> si aspetta il nome della categoria (Open M, Open F, U14 M, U16 M, U18 M).</li>
            <li>Puoi correggere formati e refusi nel passaggio successivo.</li>
          </ul>

          <button
            type="button"
            onClick={downloadTemplateCsv}
            className="text-brand-orange text-xs flex items-center gap-1 mb-4 hover:underline"
          >
            <Download size={12} /> Scarica modello CSV (solo intestazioni)
          </button>
          <label className="card p-8 border-dashed text-center cursor-pointer hover:border-court-muted transition-colors block">
            <Upload size={24} className="mx-auto text-court-muted mb-3" />
            <p className="font-display uppercase text-sm text-court-gray tracking-wide">Clicca per caricare il CSV</p>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </label>
          {uploadError && (
            <p className="text-red-400 text-sm mt-3 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {uploadError}
            </p>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="label !mb-0">Formato data</span>
              <div className="flex gap-1 flex-wrap">
                {DATE_FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDateFormatChange(opt.value)}
                    className={clsx(
                      'btn-ghost text-xs px-3 py-1.5',
                      dateFormat === opt.value && 'border-brand-orange text-brand-orange'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-court-muted text-xs">
              {rows.length} righe — {includedCount} incluse, {rows.length - includedCount} escluse
            </p>
          </div>

          <div className="card overflow-hidden mb-4">
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-court-dark">
                  <tr className="border-b border-court-border">
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 w-px">#</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Data/Ora</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 w-px">Categoria</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">Casa</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">Ospite</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">Turno</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 w-px">Risultato</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">Avvisi</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 w-px">Includi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.rowIndex}
                      className={clsx('border-b border-court-border last:border-b-0', row.excluded && 'opacity-40')}
                    >
                      <td className="px-3 py-2 text-court-muted text-xs">{row.rowIndex}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {row.scheduledAt ? (
                          new Date(row.scheduledAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' })
                        ) : (
                          <span className="text-red-400">{row.dateError}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 min-w-[7rem]">{categoryCell(row)}</td>
                      <td className="px-3 py-2 min-w-[10rem]">{teamCell(row, 'home')}</td>
                      <td className="px-3 py-2 min-w-[10rem]">{teamCell(row, 'away')}</td>
                      <td className="px-3 py-2 min-w-[10rem]">{roundCell(row)}</td>
                      <td className="px-3 py-2 text-center text-xs whitespace-nowrap w-px">
                        {row.scoreError ? (
                          <span className="text-red-400">{row.scoreError}</span>
                        ) : row.scoreHome != null || row.scoreAway != null ? (
                          <span className="text-court-light">{row.scoreHome ?? '–'} - {row.scoreAway ?? '–'}</span>
                        ) : (
                          <span className="text-court-muted opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 min-w-[12rem]">
                        <div className="flex flex-col gap-1">
                          {row.warnings.map((w, i) => (
                            <span key={i} className="flex items-start gap-1 text-[11px] text-yellow-400 leading-tight">
                              <AlertTriangle size={11} className="shrink-0 mt-0.5" /> {w.message}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!row.excluded}
                          onChange={() => toggleExclude(row.rowIndex)}
                          className="w-4 h-4 accent-brand-orange"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {importError && (
            <p className="text-red-400 text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {importError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Annulla</button>
            <button
              onClick={handleImport}
              disabled={importing || includedCount === 0 || hasBlockingRows}
              className="btn-primary text-sm px-4 py-2"
              title={hasBlockingRows ? 'Risolvi o escludi le righe con campi non riconosciuti' : undefined}
            >
              {importing ? '…' : `Importa ${includedCount} ${includedCount === 1 ? 'partita' : 'partite'}`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div>
          <p className="text-court-gray text-sm mb-6">
            {importedCount} {importedCount === 1 ? 'partita importata' : 'partite importate'} con successo
            {rows.length - includedCount > 0 && `, ${rows.length - includedCount} righe escluse`}.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary text-sm px-4 py-2">Chiudi</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
