interface Props {
  imageUrl: string | null | undefined
}

export default function LedwallBacheca({ imageUrl }: Props) {
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <p className="text-gray-400 font-display uppercase text-sm tracking-wide">
          Nessuna immagine selezionata
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="w-full h-full object-contain" />
    </div>
  )
}
