import type { Metadata } from 'next'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: { default: 'Backoffice · Canestreet 3x3', template: '%s · Backoffice · Canestreet 3x3' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-court-black">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-[4.5rem] md:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
