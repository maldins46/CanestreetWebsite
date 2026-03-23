'use client'

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-display font-extrabold text-[6rem] leading-none text-court-border">Errore</p>
        <h1 className="font-display font-bold uppercase text-xl text-court-white mt-4 mb-2">
          Si è verificato un errore
        </h1>
        <p className="text-court-gray mb-8">Qualcosa è andato storto nel pannello admin.</p>
        <button onClick={reset} className="btn-primary px-8 py-3">
          Riprova
        </button>
      </div>
    </div>
  )
}
