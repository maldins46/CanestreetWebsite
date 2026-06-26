import type { CalendarioEvent } from '@/types'
import clsx from 'clsx'
import { Info } from 'lucide-react'

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

interface Props {
  event: CalendarioEvent
}

export default function EventCard({ event }: Props) {
  const isLive = event.status === 'in_progress'
  const isDone = event.status === 'completed'

  return (
    <tr
      className={clsx(
        'border-b border-court-border last:border-b-0 transition-colors',
        isLive && 'bg-red-500/10',
        isDone && 'opacity-70',
      )}
    >
      {/* Ora */}
      <td className="px-3 py-2.5 whitespace-nowrap w-px">
        {isLive ? (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shrink-0" />
            <span className="text-red-400 font-display uppercase text-xs font-bold">Live</span>
          </span>
        ) : (
          <span className="text-court-muted text-xs" suppressHydrationWarning>{formatTime(event.scheduled_at)}</span>
        )}
      </td>

      {/* Categoria — "Evento" pill */}
      <td className="px-3 py-2.5 text-center whitespace-nowrap w-px">
        <span className="text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded bg-teal-500 text-white">
          Eventi
        </span>
      </td>

      {/* Turno — empty */}
      <td className="px-3 py-2.5 w-px whitespace-nowrap" />
      {/* Nome evento — centered over Squadra casa, Pts, Pts, Squadra ospite */}
      <td colSpan={4} className="px-3 py-2.5 text-center">
        <span className="inline-flex items-center gap-2">
          <span className="text-sm text-court-white font-medium">{event.name}</span>
          {event.description && (
            <span title={event.description} className="text-court-muted hover:text-court-white transition-colors cursor-help shrink-0">
              <Info size={14} />
            </span>
          )}
        </span>
      </td>
    </tr>
  )
}
