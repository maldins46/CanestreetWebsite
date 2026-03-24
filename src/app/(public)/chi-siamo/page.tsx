import type { Metadata } from 'next'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { StaffMember } from '@/types'

export const metadata: Metadata = {
  title: 'Chi siamo',
}

export default async function ChiSiamoPage() {
  const supabase = createServerSupabaseClient()
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('sort_order', { ascending: true }) as { data: StaffMember[] | null }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-16">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Il CaneStaff
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white mb-6">
          Chi siamo
        </h1>
        <p className="text-court-gray max-w-2xl leading-relaxed">
          Il Canestreet è un torneo estivo di basket 3×3, parte del circuito FIP, nato su iniziativa
          di alcuni amici appassionati di basket. Da piccolo torneo parrocchiale, siamo cresciuti sempre
          di più, fino all&apos;approdo nel circuito nazionale 3×3. La nostra ambizione è quella di dare
          un torneo estivo di basket alla nostra piccola città, con l&apos;obiettivo di fare sempre meglio,
          ogni anno che passa!
        </p>
      </div>

      {/* Staff grid — portrait cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        {(staff ?? []).map((member) => (
          <div key={member.id} className="card overflow-hidden flex flex-col group">
            {/* Portrait image */}
            <div className="relative w-full aspect-[3/4] bg-court-dark shrink-0 overflow-hidden">
              {member.photo_url ? (
                <Image
                  src={member.photo_url}
                  alt={member.name}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-extrabold text-8xl text-brand-orange/20 select-none">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Gradient overlay at bottom for readability */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-court-black/80 to-transparent" />
              {/* Title badge over image */}
              <div className="absolute bottom-4 left-4">
                <span className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold bg-court-black/60 px-2 py-1 backdrop-blur-sm">
                  {member.title}
                </span>
              </div>
            </div>

            {/* Text content */}
            <div className="p-5 flex flex-col flex-1 bg-court-surface">
              <h2 className="font-display font-extrabold text-xl text-court-white uppercase tracking-wide leading-tight mb-3">
                {member.name}
              </h2>
              <p className="text-court-gray text-sm leading-relaxed flex-1">{member.bio}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contact + Map */}
      <div className="border-t border-court-border pt-12">
        <h2 className="heading-section text-2xl text-court-white mb-8">Ci trovi in zona</h2>
        <div className="grid lg:grid-cols-2 gap-6">

          {/* OpenStreetMap embed — dark filter trick, stretches to match contact cards height */}
          <div className="card overflow-hidden flex flex-col">
            <iframe
              title="Playground Piazza della Repubblica, Jesi"
              src="https://www.openstreetmap.org/export/embed.html?bbox=13.2386%2C43.5183%2C13.2486%2C43.5243&layer=mapnik&marker=43.5213%2C13.2436"
              className="w-full flex-1 min-h-64 block"
              style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
              loading="lazy"
            />
          </div>

          {/* Contact cards */}
          <div className="space-y-3">
            <div className="card p-6">
              <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Location</p>
              <p className="text-court-light text-sm font-semibold">Playground Piazza della Repubblica</p>
              <p className="text-court-gray text-sm">Jesi (AN) 60035</p>
              <a
                href="https://maps.google.com/?q=Piazza+della+Repubblica,+Jesi+AN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-brand-orange hover:text-brand-orange/80 font-display uppercase tracking-widest transition-colors"
              >
                Apri in Google Maps →
              </a>
            </div>
            <div className="card p-6">
              <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Telefono</p>
              <a href="tel:+393291581724" className="text-court-light text-sm hover:text-brand-orange transition-colors">
                +39 329 158 1724
              </a>
              <p className="text-court-gray text-xs mt-1">(Michele)</p>
            </div>
            <div className="card p-6">
              <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Email</p>
              <a href="mailto:canestreet3vs3@gmail.com" className="text-court-light text-sm hover:text-brand-orange transition-colors break-all">
                canestreet3vs3@gmail.com
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
