'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { NewsArticle } from '@/types'
import { Save, Trash2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import MediaPickerInput from './MediaPickerInput'
import MarkdownContent from '@/components/MarkdownContent'

interface Props { article: NewsArticle | null }

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function NewsEditor({ article }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState({
    title:     article?.title     ?? '',
    slug:      article?.slug      ?? '',
    excerpt:   article?.excerpt   ?? '',
    cover_url: article?.cover_url ?? '',
    body:      article?.body      ?? '',
    published: article?.published ?? false,
  })
  const [bodyMode, setBodyMode] = useState<'edit' | 'preview'>('edit')
  const [imgOpen,  setImgOpen]  = useState(false)
  const [imgFiles, setImgFiles] = useState<{ name: string; url: string }[]>([])
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg,      setMsg]      = useState<string | null>(null)

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function openImgPicker() {
    if (imgFiles.length === 0) {
      const { data } = await supabase.storage.from('media').list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (data) {
        const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
        setImgFiles(
          data
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => ({ name: f.name, url: base + f.name }))
        )
      }
    }
    setImgOpen(v => !v)
  }

  function insertImage(url: string) {
    const ta = bodyRef.current
    const snippet = `\n![](${url})\n`
    if (!ta) {
      set('body', form.body + snippet)
    } else {
      const pos = ta.selectionStart
      set('body', form.body.slice(0, pos) + snippet + form.body.slice(pos))
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = pos + snippet.length
      }, 0)
    }
    setImgOpen(false)
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

      {/* Body editor */}
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex border border-court-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setBodyMode('edit')}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide transition-colors ${
                bodyMode === 'edit'
                  ? 'bg-brand-orange text-white'
                  : 'text-court-gray hover:text-court-white'
              }`}
            >
              Modifica
            </button>
            <button
              type="button"
              onClick={() => setBodyMode('preview')}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide transition-colors ${
                bodyMode === 'preview'
                  ? 'bg-brand-orange text-white'
                  : 'text-court-gray hover:text-court-white'
              }`}
            >
              Anteprima
            </button>
          </div>

          <button
            type="button"
            onClick={openImgPicker}
            className="flex items-center gap-1.5 btn-ghost text-xs px-3 py-1.5"
          >
            <ImageIcon size={12} />
            Inserisci immagine
          </button>
        </div>

        {/* Inline image picker */}
        {imgOpen && (
          <div className="mb-2 card p-3 max-h-48 overflow-y-auto">
            {imgFiles.length === 0 ? (
              <p className="text-court-muted text-sm text-center py-4">Caricamento...</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {imgFiles.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => insertImage(f.url)}
                    className="relative aspect-square overflow-hidden border-2 border-court-border hover:border-brand-orange transition-colors"
                    title={f.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.name} className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit / Preview area */}
        {bodyMode === 'edit' ? (
          <textarea
            ref={bodyRef}
            className="input resize-none font-mono text-sm w-full"
            rows={16}
            value={form.body}
            onChange={e => set('body', e.target.value)}
            placeholder="## Titolo sezione&#10;&#10;Testo dell'articolo con **grassetto**, *corsivo*...&#10;&#10;- Punto elenco"
          />
        ) : (
          <div className="input min-h-[24rem] overflow-y-auto">
            {form.body.trim() ? (
              <MarkdownContent>{form.body}</MarkdownContent>
            ) : (
              <p className="text-court-muted text-sm italic">_(vuoto)_</p>
            )}
          </div>
        )}

        <p className="text-court-muted text-xs mt-1">
          Markdown: <code className="text-court-gray">**grassetto**</code>, <code className="text-court-gray">## titolo</code>, <code className="text-court-gray">[link](url)</code>, <code className="text-court-gray">![alt](url)</code>, liste con <code className="text-court-gray">-</code>. HTML inline ammesso.
        </p>
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
