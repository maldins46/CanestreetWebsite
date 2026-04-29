'use server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type NewsPayload = {
  title: string
  slug: string
  excerpt: string | null
  cover_url: string | null
  body: string
  published: boolean
  published_at: string | null
  updated_at: string
}

function bustNewsCache() {
  revalidatePath('/news')
  revalidatePath('/news/[slug]', 'page')
}

export async function saveArticle(
  id: string | null,
  payload: NewsPayload,
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient()
  let error
  if (id) {
    ;({ error } = await supabase.from('news').update(payload).eq('id', id))
  } else {
    ;({ error } = await supabase.from('news').insert({
      ...payload,
      created_at: new Date().toISOString(),
    }))
  }
  if (error) return { error: error.message }
  bustNewsCache()
  return {}
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('news').delete().eq('id', id)
  if (error) return { error: error.message }
  bustNewsCache()
  return {}
}
