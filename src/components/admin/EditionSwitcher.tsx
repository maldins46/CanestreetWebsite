'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Edition } from '@/types'

interface Props {
  editions: Pick<Edition, 'id' | 'year' | 'title' | 'is_current'>[]
  currentEditionId: string
}

export default function EditionSwitcher({ editions, currentEditionId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(editionId: string) {
    const params = new URLSearchParams(searchParams.toString())
    // If switching to the is_current edition, remove param to keep URL clean
    const isCurrent = editions.find(e => e.id === editionId)?.is_current
    if (isCurrent) {
      params.delete('edition')
    } else {
      params.set('edition', editionId)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      value={currentEditionId}
      onChange={e => handleChange(e.target.value)}
      className="input py-1.5 px-3 text-sm w-auto"
    >
      {editions.map(e => (
        <option key={e.id} value={e.id}>
          {e.title}{e.is_current ? ' (corrente)' : ''}
        </option>
      ))}
    </select>
  )
}
