import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Backoffice · Canestreet 3×3', template: '%s · Backoffice · Canestreet 3×3' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
