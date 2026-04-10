import type { Metadata } from 'next'
import Image from 'next/image'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"
import type { StaffMember } from '@/types'

import StaffCard from '@/components/public/StaffCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Chi siamo',
}

export default async function ChiSiamoPage() {
  const supabase = createPublicServerSupabaseClient()
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .order('sort_order', { ascending: true }) as { data: StaffMember[] | null; error: unknown }
  if (error) console.error('[chi-siamo] staff query failed:', error)

  const jesiImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/jesi.png`

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
          <StaffCard key={member.id} member={member} />
        ))}
      </div>

      {/* Contact + Map */}
      <div className="border-t border-court-border pt-12">
        <h2 className="heading-section text-2xl text-court-white mb-8">Ci trovi in zona</h2>
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Static photo of Jesi */}
          <div className="card overflow-hidden relative h-full">
            <Image
              src={jesiImageUrl}
              alt="Playground Piazza della Repubblica, Jesi"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
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
