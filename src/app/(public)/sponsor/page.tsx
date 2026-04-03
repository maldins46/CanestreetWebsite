import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Sponsor, SponsorTier } from '@/types'
import { ExternalLink, Mail, Phone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sponsor e Partner',
  description: 'Le aziende e i partner che supportano il Canestreet 3×3, il torneo di basket estivo di Jesi.',
}

interface TierConfig {
  label: string
  description: string
  gridClass: string
  showDescription: boolean
}

const TIER_CONFIG: Record<SponsorTier, TierConfig> = {
  main: {
    label: 'Main Sponsor',
    description: 'I nostri partner principali, senza i quali nulla sarebbe possibile.',
    gridClass: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    showDescription: true,
  },
  gold: {
    label: 'Gold Sponsor',
    description: 'Partner gold che contribuiscono a rendere il torneo un successo.',
    gridClass: 'grid grid-cols-2 md:grid-cols-3 gap-5',
    showDescription: true,
  },
  silver: {
    label: 'Silver Sponsor',
    description: '',
    gridClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
    showDescription: false,
  },
  bronze: {
    label: 'Bronze Sponsor',
    description: '',
    gridClass: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3',
    showDescription: false,
  },
}

const TIER_ACCENT: Record<SponsorTier, string> = {
  main:   'text-brand-orange',
  gold:   'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-amber-500',
}

function SponsorCard({ sponsor, config }: { sponsor: Sponsor; config: TierConfig }) {
  const Wrapper = sponsor.website_url ? 'a' : 'div'
  const wrapperProps = sponsor.website_url
    ? { href: sponsor.website_url, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`card p-5 flex flex-col gap-4 ${sponsor.website_url ? 'hover:border-court-muted transition-colors group' : ''}`}
    >
      {/* Logo */}
      <div className="relative w-full aspect-[3/2] bg-white overflow-hidden ring-1 ring-brand-orange/20 group-hover:ring-brand-orange/70 transition-all duration-200">
        {sponsor.logo_url ? (
          <Image
            src={sponsor.logo_url}
            alt={sponsor.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-2xl text-gray-400">{sponsor.name.charAt(0)}</span>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="font-display font-bold uppercase text-court-white text-sm tracking-wide flex items-center gap-1.5">
          {sponsor.name}
          {sponsor.website_url && (
            <ExternalLink size={11} className="text-court-muted group-hover:text-brand-orange transition-colors shrink-0" />
          )}
        </p>
        {config.showDescription && sponsor.description && (
          <p className="text-court-gray text-xs mt-1 leading-relaxed">{sponsor.description}</p>
        )}
      </div>
    </Wrapper>
  )
}

function LogoCard({ sponsor }: { sponsor: Sponsor }) {
  const Wrapper = sponsor.website_url ? 'a' : 'div'
  const wrapperProps = sponsor.website_url
    ? { href: sponsor.website_url, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`card p-3 flex flex-col items-center gap-2 ${sponsor.website_url ? 'hover:border-court-muted transition-colors group' : ''}`}
      title={sponsor.name}
    >
      <div className="relative w-full aspect-[3/2] bg-white overflow-hidden ring-1 ring-brand-orange/20 group-hover:ring-brand-orange/70 transition-all duration-200">
        {sponsor.logo_url ? (
          <Image
            src={sponsor.logo_url}
            alt={sponsor.name}
            fill
            className="object-contain p-2"
            sizes="120px"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg text-gray-400">{sponsor.name.charAt(0)}</span>
        )}
      </div>
      <p className="font-display uppercase text-court-gray text-[10px] tracking-wide text-center truncate w-full group-hover:text-court-light transition-colors">
        {sponsor.name}
      </p>
    </Wrapper>
  )
}

export default async function SponsorPage() {
  const supabase = createServerSupabaseClient()
  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true }) as { data: Sponsor[] | null }

  const grouped: Record<SponsorTier, Sponsor[]> = {
    main:   sponsors?.filter(s => s.tier === 'main')   ?? [],
    gold:   sponsors?.filter(s => s.tier === 'gold')   ?? [],
    silver: sponsors?.filter(s => s.tier === 'silver') ?? [],
    bronze: sponsors?.filter(s => s.tier === 'bronze') ?? [],
  }

  const tiers: SponsorTier[] = ['main', 'gold', 'silver', 'bronze']
  const hasAny = tiers.some(t => grouped[t].length > 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">

      {/* Header */}
      <div className="mb-16">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Partner &amp; Sponsor
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white mb-6">
          I Nostri Partner
        </h1>
        <p className="text-court-gray max-w-2xl leading-relaxed">
          Il Canestreet 3×3 è possibile grazie al supporto di aziende e partner che credono nel basket,
          nel territorio e nei valori dello sport. A loro va il nostro più sentito ringraziamento.
        </p>
      </div>

      {/* Sponsor sections by tier */}
      {hasAny ? (
        <div className="space-y-16 mb-24">
          {tiers.map(tier => {
            const list = grouped[tier]
            if (!list.length) return null
            const cfg = TIER_CONFIG[tier]
            return (
              <section key={tier}>
                <div className="mb-6">
                  <p className={`font-display uppercase tracking-[0.3em] text-xs font-semibold mb-1 ${TIER_ACCENT[tier]}`}>
                    {cfg.label}
                  </p>
                  {cfg.description && (
                    <p className="text-court-gray text-sm">{cfg.description}</p>
                  )}
                </div>

                {tier === 'bronze' ? (
                  <div className={cfg.gridClass}>
                    {list.map(s => <LogoCard key={s.id} sponsor={s} />)}
                  </div>
                ) : (
                  <div className={cfg.gridClass}>
                    {list.map(s => <SponsorCard key={s.id} sponsor={s} config={cfg} />)}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="card p-16 text-center mb-24">
          <p className="text-court-gray text-lg font-display uppercase tracking-wide">
            Partner in arrivo
          </p>
          <p className="text-court-muted text-sm mt-2">
            Presto annunceremo i nostri sponsor per questa edizione.
          </p>
        </div>
      )}

      {/* Diventa Sponsor CTA */}
      <section className="border-t border-court-border pt-16">
        <div className="max-w-2xl">
          <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
            Opportunità
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-court-white mb-4">
            Diventa nostro partner
          </h2>
          <p className="text-court-gray leading-relaxed mb-4">
            Il Canestreet 3×3 porta ogni anno centinaia di atleti e famiglie nel cuore di Jesi.
            Sponsorizzare il torneo significa associare il tuo marchio a un evento sportivo autentico,
            con forte radicamento sul territorio e visibilità garantita.
          </p>
          <p className="text-court-gray leading-relaxed mb-8">
            Offriamo pacchetti di sponsorizzazione flessibili, dal logo sul materiale ufficiale
            alla presenza attiva durante l&apos;evento. Contattaci per ricevere il nostro media kit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="mailto:canestreet3vs3@gmail.com"
              className="btn-primary text-sm px-6 py-3 inline-flex items-center gap-2"
            >
              <Mail size={14} /> canestreet3vs3@gmail.com
            </Link>
            <Link
              href="tel:+393291581724"
              className="btn-ghost text-sm px-6 py-3 inline-flex items-center gap-2"
            >
              <Phone size={14} /> +39 329 158 1724
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
