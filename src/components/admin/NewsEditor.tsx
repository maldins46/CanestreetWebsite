'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { NewsArticle } from '@/types'
import { Save, Trash2, Eye, EyeOff } from 'lucide-react'
import MediaPickerInput from './MediaPickerInput'

interface Props { article: NewsArticle | null }

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function NewsEditor({ article }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({
    title:     article?.title     ?? '',
    slug:      article?.slug      ?? '',
    excerpt:   article?.excerpt   ?? '',
    cover_url: article?.cover_url ?? '',
    body:      article?.body      ?? '',
    published: article?.published ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    const payload = {
      ...form,
      cover_url: form.cover_url || null,
      published_at: form.published ? (article?.published_at ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }
    let error
    if (article) {
      ({ error } = await supabase.from('news').update(payload).eq('id', article.id))
    } else {
      ({ error } = await supabase.from('news').insert({ ...payload, created_at: new Date().toISOString() }))
    }
    setSaving(false)
    if (error) { setMsg('Errore: ' + error.message); return }
    setMsg('Salvato!')
    router.push('/admin/news?t=' + Date.now())
  }

  async function deleteArticle() {
    if (!article || !confirm('Eliminare questo articolo?')) return
    setDeleting(true)
    await supabase.from('news').delete().eq('id', article.id)
    router.push('/admin/news?t=' + Date.now())
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <label className="label">Titolo *</label>
        <input
          className="input text-lg"
          value={form.title}
          onChange={e => {
            set('title', e.target.value)
            if (!article) set('slug', slugify(e.target.value))
          }}
          placeholder="Titolo dell'articolo"
        />
      </div>

      <div>
        <label className="label">Slug (URL)</label>
        <input className="input font-mono text-sm" value={form.slug}
          onChange={e => set('slug', e.target.value)} placeholder="url-articolo" />
      </div>

      <div>
        <label className="label">Sommario</label>
        <textarea className="input resize-none" rows={2} value={form.excerpt}
          onChange={e => set('excerpt', e.target.value)}
          placeholder="Breve descrizione dell'articolo (usata nelle anteprime)" />
      </div>

      <MediaPickerInput
        label="Immagine di copertina"
        value={form.cover_url}
        onChange={url => set('cover_url', url)}
        preview="cover"
        inputClassName="text-sm"
      />

      <div>
        <label className="label">Contenuto (HTML o testo)</label>
        <textarea className="input resize-none font-mono text-sm" rows={16} value={form.body}
          onChange={e => set('body', e.target.value)}
          placeholder="<p>Testo dell'articolo...</p>" />
        <p className="text-court-muted text-xs mt-1">Puoi usare tag HTML base: &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-court-border">
        <button
          onClick={() => set('published', !form.published)}
          className="flex items-center gap-2 text-sm font-display uppercase tracking-wide text-court-gray hover:text-court-white transition-colors"
        >
          {form.published ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} />}
          {form.published ? 'Pubblicato' : 'Bozza'}
        </button>

        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2 ml-auto">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {article && (
          <button onClick={deleteArticle} disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-display uppercase tracking-wide transition-colors">
            <Trash2 size={14} /> Elimina
          </button>
        )}

        {msg && <p className="text-sm text-green-400 animate-fade-in">{msg}</p>}
      </div>
    </div>
  )
}
