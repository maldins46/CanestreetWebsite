interface Props {
  name: string
  description?: string | null
}

export default function LedwallEvent({ name, description }: Props) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          Evento
        </h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        <h2 className="font-display font-bold uppercase text-3xl text-gray-900 text-center leading-tight">
          {name}
        </h2>
        {description && (
          <p className="font-body text-base text-gray-600 text-center max-w-lg leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
