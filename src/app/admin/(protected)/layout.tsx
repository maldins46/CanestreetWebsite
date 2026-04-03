'use client'
import { useRef } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { useAdminTheme } from '@/hooks/useAdminTheme'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useAdminTheme(containerRef)

  return (
    <div
      ref={containerRef}
      data-theme="dark"
      suppressHydrationWarning
      className="min-h-screen flex bg-court-black"
    >
      <AdminSidebar theme={theme} onThemeChange={setTheme} />
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-[4.5rem] md:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
