import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-display font-extrabold text-[8rem] leading-none text-court-border">404</p>
        <h1 className="font-display font-bold uppercase text-2xl text-court-white mt-4 mb-2">
          Pagina non trovata
        </h1>
        <p className="text-court-gray mb-8">La pagina che cerchi non esiste.</p>
        <Link href="/" className="btn-primary px-8 py-3">← Torna alla home</Link>
      </div>
    </div>
  )
}
