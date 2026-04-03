'use client'
import { useState, useEffect, useCallback } from 'react'
import type { RefObject } from 'react'

export type AdminTheme = 'dark' | 'light' | 'system'
const STORAGE_KEY = 'admin-theme'
const DEFAULT: AdminTheme = 'dark'

export function useAdminTheme(containerRef: RefObject<HTMLElement>) {
  const [theme, setThemeState] = useState<AdminTheme>(DEFAULT)

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as AdminTheme) ?? DEFAULT
    setThemeState(stored)
    containerRef.current?.setAttribute('data-theme', stored)
  }, [containerRef])

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    containerRef.current?.setAttribute('data-theme', next)
  }, [containerRef])

  return { theme, setTheme }
}
