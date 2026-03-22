import MediaManager from '@/components/admin/MediaManager'

export default function AdminMediaPage() {
  return (
    <div>
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Media</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Media</h1>
        <p className="text-court-gray text-sm mt-1">Carica foto e immagini per il sito e gli articoli.</p>
      </div>
      <MediaManager />
    </div>
  )
}
