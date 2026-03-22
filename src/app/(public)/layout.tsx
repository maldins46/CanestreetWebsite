import Link from 'next/link'
import PublicNav from '@/components/public/PublicNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-court-border mt-24 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            {/* Brand + contact */}
            <div>
              <p className="font-display font-bold uppercase tracking-widest text-brand-orange text-lg">
                Cane Street 3×3
              </p>
              <p className="text-court-gray text-sm mt-1 mb-4">Il torneo estivo di basket 3×3 — Jesi</p>
              <div className="flex flex-col gap-1 text-court-muted text-xs">
                <span>📍 Piazza della Repubblica, Jesi (AN) 60035</span>
                <span>📱 <a href="tel:+393291581724" className="hover:text-court-white transition-colors">329 158 1724</a> (Michele)</span>
                <span>✉️ <a href="mailto:canestreet3vs3@gmail.com" className="hover:text-court-white transition-colors">canestreet3vs3@gmail.com</a></span>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-court-gray items-start">
              <Link href="/standings"   className="hover:text-court-white transition-colors">Classifica</Link>
              <Link href="/news"        className="hover:text-court-white transition-colors">News</Link>
              <Link href="/editions"    className="hover:text-court-white transition-colors">Edizioni</Link>
              <Link href="/chi-siamo"   className="hover:text-court-white transition-colors">Chi siamo</Link>
              <Link href="/regolamento" className="hover:text-court-white transition-colors">Regolamento</Link>
              <Link href="/register"    className="hover:text-court-white transition-colors">Iscriviti</Link>
            </div>

            {/* Socials */}
            <div className="flex gap-4 text-sm text-court-gray items-start">
              <a href="https://www.instagram.com/canestreet3x3" target="_blank" rel="noopener noreferrer"
                 className="hover:text-brand-orange transition-colors font-display uppercase tracking-wide text-xs">
                Instagram
              </a>
              <a href="https://www.facebook.com/thecanestreet" target="_blank" rel="noopener noreferrer"
                 className="hover:text-brand-orange transition-colors font-display uppercase tracking-wide text-xs">
                Facebook
              </a>
            </div>
          </div>

          <div className="border-t border-court-border/50 pt-4">
            <p className="text-court-muted text-xs">© {new Date().getFullYear()} The Canestreet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
