'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const RefreshTimer = dynamic(() => import('./RefreshTimer'), { ssr: false })

interface AutoRefreshProps {
  intervalMs?: number
}

export default function AutoRefresh(props: AutoRefreshProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <RefreshTimer intervalMs={props.intervalMs} />
}
