'use client'
import { useEffect } from 'react'

interface Props {
  intervalMs?: number
}

export default function RefreshTimer({ intervalMs = 15_000 }: Props) {
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload()
    }, intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return null
}
