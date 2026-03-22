import Link from 'next/link'
import PublicNav from '@/components/public/PublicNav'

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-court-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            {/* Brand + contact */}
            <div>
              <p className="font-display font-bold uppercase tracking-widest text-brand-orange text-lg">
                Canestreet 3×3
              </p>
              <p className="text-court-gray text-sm mt-1 mb-4">A FIP 3×3 summer tournament. In the heart of Jesi.</p>
              <div className="flex flex-col gap-1 text-court-muted text-xs">
                <span>Piazza della Repubblica, Jesi (AN) 60035</span>
                <span><a href="tel:+393291581724" className="hover:text-court-white transition-colors">329 158 1724</a> (Michele)</span>
                <span><a href="mailto:canestreet3vs3@gmail.com" className="hover:text-court-white transition-colors">canestreet3vs3@gmail.com</a></span>
              </div>
            </div>

            {/* Nav links + socials */}
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-x-10 gap-y-3">
                <Link href="/standings"   className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">Classifica</Link>
                <Link href="/news"        className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">News</Link>
                <Link href="/editions"    className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">Edizioni</Link>
                <Link href="/chi-siamo"   className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">Chi siamo</Link>
                <Link href="/regolamento" className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">Regolamento</Link>
                <Link href="/register"    className="font-display font-semibold uppercase tracking-wider text-xs text-court-gray hover:text-court-white transition-colors whitespace-nowrap">Iscriviti</Link>
              </div>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/canestreet3x3" target="_blank" rel="noopener noreferrer"
                   className="text-court-gray hover:text-brand-orange transition-colors" aria-label="Instagram">
                  <InstagramIcon />
                </a>
                <a href="https://www.facebook.com/thecanestreet" target="_blank" rel="noopener noreferrer"
                   className="text-court-gray hover:text-brand-orange transition-colors" aria-label="Facebook">
                  <FacebookIcon />
                </a>
              </div>
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
