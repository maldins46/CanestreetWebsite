import { MetadataRoute } from 'next'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canestreet.it'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicServerSupabaseClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/rules`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/tournament`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/register`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/editions`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/news`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/sponsor`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Dynamic: published news articles
  const { data: news, error: newsErr } = await supabase
    .from('news')
    .select('slug, updated_at')
    .eq('published', true)
  if (newsErr) console.error('[sitemap] news query failed:', newsErr)

  const newsPages: MetadataRoute.Sitemap = (news ?? []).map((article) => ({
    url: `${BASE_URL}/news/${article.slug}`,
    lastModified: article.updated_at,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // Dynamic: edition years
  const { data: editions, error: editionsErr } = await supabase
    .from('editions')
    .select('year, updated_at')
  if (editionsErr) console.error('[sitemap] editions query failed:', editionsErr)

  const editionPages: MetadataRoute.Sitemap = (editions ?? []).map((edition) => ({
    url: `${BASE_URL}/editions/${edition.year}`,
    lastModified: edition.updated_at,
    changeFrequency: 'yearly',
    priority: 0.5,
  }))

  return [...staticPages, ...newsPages, ...editionPages]
}
