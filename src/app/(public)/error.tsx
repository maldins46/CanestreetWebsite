'use client'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-display font-extrabold text-[8rem] leading-none text-court-border">500</p>
        <h1 className="font-display font-bold uppercase text-2xl text-court-white mt-4 mb-2">
          Qualcosa è andato storto
        </h1>
        <p className="text-court-gray mb-8">Si è verificato un errore imprevisto.</p>
        <button onClick={reset} className="btn-primary px-8 py-3">
          Riprova
        </button>
      </div>
    </div>
  )
}
