import Link from 'next/link'
import PublicNav from '@/components/public/PublicNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-court-border mt-24 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="font-display font-bold uppercase tracking-widest text-brand-orange">
              Cane Street 3x3
            </p>
            <p className="text-court-gray text-sm mt-1">Il torneo estivo di basket 3x3</p>
          </div>
          <nav className="flex gap-6 text-sm text-court-gray">
            <Link href="/standings" className="hover:text-court-white transition-colors">Classifica</Link>
            <Link href="/news"      className="hover:text-court-white transition-colors">News</Link>
            <Link href="/register"  className="hover:text-court-white transition-colors">Iscriviti</Link>
            <Link href="/editions"  className="hover:text-court-white transition-colors">Edizioni</Link>
          </nav>
          <p className="text-court-muted text-xs">© {new Date().getFullYear()} Cane Street</p>
        </div>
      </footer>
    </div>
  )
}
