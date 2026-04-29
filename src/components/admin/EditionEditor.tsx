'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Edition, EditionWinner } from '@/types'
import { Save, Trash2, Plus, Star, StarOff, LockOpen, Lock, Image as ImageIcon } from 'lucide-react'
import MediaPickerInput from './MediaPickerInput'
import MarkdownContent from '@/components/MarkdownContent'

interface Props {
  edition: Edition | null
  winners: EditionWinner[]
}

type WinnerRow = Omit<EditionWinner, 'created_at'>

export default function EditionEditor({ edition, winners }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    year:              edition?.year              ?? new Date().getFullYear(),
    title:             edition?.title             ?? '',
    subtitle:          edition?.subtitle          ?? '',
    description:       edition?.description       ?? '',
    cover_url:         edition?.cover_url         ?? '',
    is_current:        edition?.is_current        ?? false,
    registration_open: edition?.registration_open ?? false,
  })
  const [rows, setRows] = useState<WinnerRow[]>(
    winners.map(w => ({ ...w }))
  )
  const descRef = useRef<HTMLTextAreaElement>(null)
  const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit')
  const [imgOpen,  setImgOpen]  = useState(false)
  const [imgFiles, setImgFiles] = useState<{ name: string; url: string }[]>([])
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg,      setMsg]      = useState<string | null>(null)

  function set(field: string, value: string | number | boolean) {
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
    const ta = descRef.current
    const snippet = `\n![](${url})\n`
    if (!ta) {
      set('description', form.description + snippet)
    } else {
      const pos = ta.selectionStart
      set('description', form.description.slice(0, pos) + snippet + form.description.slice(pos))
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = pos + snippet.length
      }, 0)
    }
    setImgOpen(false)
  }

  function addWinner() {
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      edition_id: edition?.id ?? '',
      category: '',
      winner_name: '',
      photo_url: null,
      sort_order: prev.length,
    }])
  }

  function updateWinner(id: string, field: keyof WinnerRow, value: string | number | null) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function removeWinner(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  async function save() {
    setSaving(true)
    setMsg(null)

    const payload = {
      year:              form.year,
      title:             form.title,
      subtitle:          form.subtitle || null,
      description:       form.description || null,
      cover_url:         form.cover_url || null,
      is_current:        form.is_current,
      registration_open: form.registration_open,
    }

    let editionId = edition?.id
    let error

    if (edition) {
      ;({ error } = await supabase.from('editions').update(payload).eq('id', edition.id))
    } else {
      const { data, error: insertError } = await supabase
        .from('editions')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select('id')
        .single()
      error = insertError
      editionId = data?.id
    }

    if (error) { setSaving(false); setMsg('Errore: ' + error.message); return }

    // Upsert winners
    if (rows.length > 0 && editionId) {
      const winnersPayload = rows.map((r, i) => ({
        ...r,
        edition_id: editionId!,
        sort_order: i,
      }))
      const { error: wErr } = await supabase.from('edition_winners').upsert(winnersPayload)
      if (wErr) { setSaving(false); setMsg('Errore vincitori: ' + wErr.message); return }
    }

    // Delete removed winners
    const removedIds = winners.map(w => w.id).filter(id => !rows.find(r => r.id === id))
    if (removedIds.length) {
      await supabase.from('edition_winners').delete().in('id', removedIds)
    }

    setSaving(false)
    setMsg('Salvato!')
    router.push('/admin/editions?t=' + Date.now())
  }

  async function deleteEdition() {
    if (!edition || !confirm('Eliminare questa edizione? Verranno eliminati anche tutti i vincitori associati.')) return
    setDeleting(true)
    await supabase.from('editions').delete().eq('id', edition.id)
    router.push('/admin/editions?t=' + Date.now())
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Main fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Anno *</label>
          <input
            type="number"
            className="input"
            value={form.year}
            onChange={e => set('year', parseInt(e.target.value) || new Date().getFullYear())}
            placeholder="2025"
          />
        </div>
        <div className="flex items-end pb-1">
          <button
            onClick={() => set('is_current', !form.is_current)}
            className="flex items-center gap-2 text-sm font-display uppercase tracking-wide text-court-gray hover:text-court-white transition-colors"
          >
            {form.is_current
              ? <Star size={14} className="text-brand-orange" />
              : <StarOff size={14} />}
            {form.is_current ? 'Edizione corrente' : 'Non corrente'}
          </button>
        </div>
      </div>

      <div>
        <label className="label">Titolo *</label>
        <input
          className="input text-lg"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Nome dell'edizione"
        />
      </div>

      <div>
        <label className="label">Sottotitolo</label>
        <input
          className="input"
          value={form.subtitle}
          onChange={e => set('subtitle', e.target.value)}
          placeholder="Breve sottotitolo"
        />
      </div>

      <div>
        <label className="label">Descrizione</label>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex border border-court-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setDescMode('edit')}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide transition-colors ${
                descMode === 'edit'
                  ? 'bg-brand-orange text-white'
                  : 'text-court-gray hover:text-court-white'
              }`}
            >
              Modifica
            </button>
            <button
              type="button"
              onClick={() => setDescMode('preview')}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide transition-colors ${
                descMode === 'preview'
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

        {descMode === 'edit' ? (
          <textarea
            ref={descRef}
            className="input resize-none font-mono text-sm w-full"
            rows={6}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Racconta questa edizione..."
          />
        ) : (
          <div className="input min-h-[9rem] overflow-y-auto">
            {form.description.trim() ? (
              <MarkdownContent>{form.description}</MarkdownContent>
            ) : (
              <p className="text-court-muted text-sm italic">_(vuoto)_</p>
            )}
          </div>
        )}

        <p className="text-court-muted text-xs mt-1">
          Markdown: <code className="text-court-gray">**grassetto**</code>, <code className="text-court-gray">## titolo</code>, <code className="text-court-gray">[link](url)</code>, <code className="text-court-gray">![alt](url)</code>, liste con <code className="text-court-gray">-</code>.
        </p>
      </div>

      <MediaPickerInput
        label="URL copertina"
        value={form.cover_url}
        onChange={url => set('cover_url', url)}
        preview="cover"
        inputClassName="font-mono text-sm"
      />

      {/* Winners section */}
      <div className="border-t border-court-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold uppercase text-court-white tracking-wide">Vincitori</h2>
          <button onClick={addWinner} className="btn-ghost text-xs px-3 py-1.5">
            <Plus size={12} /> Aggiungi categoria
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="text-court-muted text-sm">Nessun vincitore ancora. Aggiungi le categorie e i vincitori.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="card p-4 flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Categoria *</label>
                    <input
                      className="input py-1.5 text-sm"
                      value={row.category}
                      onChange={e => updateWinner(row.id, 'category', e.target.value)}
                      placeholder="Senior, Under 18, ..."
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Vincitore *</label>
                    <input
                      className="input py-1.5 text-sm"
                      value={row.winner_name}
                      onChange={e => updateWinner(row.id, 'winner_name', e.target.value)}
                      placeholder="Nome squadra o giocatore"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label text-xs">URL foto (opzionale)</label>
                    <input
                      className="input py-1.5 text-sm font-mono"
                      value={row.photo_url ?? ''}
                      onChange={e => updateWinner(row.id, 'photo_url', e.target.value || null)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeWinner(row.id)}
                  className="text-court-muted hover:text-red-400 transition-colors p-1 mt-5 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration open toggle */}
      <div className="border-t border-court-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold uppercase text-court-white tracking-wide">Iscrizioni</h2>
            <p className="text-court-muted text-xs mt-1">
              {form.registration_open
                ? 'Le iscrizioni sono aperte. Il modulo di registrazione è visibile sul sito.'
                : 'Le iscrizioni sono chiuse. Il modulo non è accessibile al pubblico.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('registration_open', !form.registration_open)}
            className={`flex items-center gap-2 px-4 py-2 font-display uppercase tracking-wide text-sm border transition-colors ${
              form.registration_open
                ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
            }`}
          >
            {form.registration_open ? <LockOpen size={14} /> : <Lock size={14} />}
            {form.registration_open ? 'Aperte' : 'Chiuse'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-court-border">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2 ml-auto">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {edition && (
          <button
            onClick={deleteEdition}
            disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-display uppercase tracking-wide transition-colors"
          >
            <Trash2 size={14} /> Elimina
          </button>
        )}

        {msg && <p className="text-sm text-green-400 animate-fade-in">{msg}</p>}
      </div>
    </div>
  )
}
