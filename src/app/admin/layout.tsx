import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Backoffice · Canestreet 3x3', template: '%s · Backoffice · Canestreet 3x3' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
