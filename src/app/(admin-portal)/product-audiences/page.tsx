'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, Plus, Search, RefreshCw, Loader2, Tag, CheckCircle2, AlertCircle, Pencil, Trash2, X, Check } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/client'

type Audience = { value: string; label: string; sort_order: number }

export default function ProductAudiencesPage() {
  const [rows, setRows] = useState<Audience[]>([])
  const [label, setLabel] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await createAdminClient().from('product_audiences').select('*').order('sort_order').order('label')
      if (error) throw error
      setRows(data ?? [])
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load audiences. Please try again.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = label.trim()
    const value = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!value) { setError('Enter a valid audience name.'); return }
    if (rows.some(row => row.value === value)) { setError('This audience already exists.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const { error } = await createAdminClient().from('product_audiences').insert({ value, label: name, sort_order: Math.max(0, ...rows.map(row => row.sort_order)) + 1 })
      if (error) throw error
      setLabel('')
      await load()
      setNotice(`${name} added successfully.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not add audience. Please check your permissions and try again.')
    } finally { setBusy(false) }
  }
  const updateAudience = async (row: Audience) => {
    if (!editLabel.trim()) { setError('Audience name is required.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const { data, error } = await createAdminClient().from('product_audiences').update({ label: editLabel.trim() }).eq('value', row.value).select('value').single()
      if (error || !data) throw error ?? new Error('Could not update audience.')
      setEditing(null)
      await load()
      setNotice('Audience updated successfully.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update audience.') }
    finally { setBusy(false) }
  }
  const deleteAudience = async (row: Audience) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const client = createAdminClient()
      const { count, error: usageError } = await client.from('products').select('id', { count: 'exact', head: true }).eq('target_audience', row.value)
      if (usageError) throw usageError
      if (count) throw new Error('This audience is used by products. Assign those products another audience before deleting it.')
      const { data, error } = await client.from('product_audiences').delete().eq('value', row.value).select('value').single()
      if (error || !data) throw error ?? new Error('Could not delete audience.')
      setDeleting(null)
      await load()
      setNotice(`${row.label} deleted successfully.`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not delete audience.') }
    finally { setBusy(false) }
  }
  const visible = rows.filter(row => row.label.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20"><Users size={21} /></div>
          <div><h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Product Audiences</h1><p className="text-sm text-slate-500">Manage who your products are for across the rewards store.</p></div>
        </div>
        <button onClick={() => input.current?.focus()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"><Plus size={16} />Add Audience</button>
      </header>

      {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</p>}
      {notice && <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18} />{notice}</p>}

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-[#1857D6]"><Users size={20} /></span><div><p className="text-2xl font-bold text-slate-900">{loading ? '—' : rows.length}</p><p className="text-xs font-medium text-slate-500">Total audiences</p></div></div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Plus size={18} className="text-[#1857D6]" />New audience</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Added audiences appear in product forms and the shop audience filter.</p>
          <form onSubmit={add} className="mt-6 space-y-4">
            <div><label htmlFor="audience-name" className="text-sm font-semibold text-slate-700">Audience name</label><input ref={input} id="audience-name" required maxLength={60} disabled={busy} value={label} onChange={event => setLabel(event.target.value)} placeholder="e.g. Teens" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-black placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
            <button disabled={busy || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{busy ? 'Saving…' : 'Add Audience'}</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="text-base font-bold text-slate-900">Audience list</h2><button onClick={() => void load()} disabled={loading || busy} aria-label="Refresh audiences" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button></div>
          <div className="px-6 py-4"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Search audiences" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search audiences…" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div></div>
          {loading ? <div role="status" className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-[#1857D6]" /><span className="sr-only">Loading audiences</span></div> : visible.length === 0 ? <div className="px-6 py-14 text-center"><Users size={32} className="mx-auto mb-3 text-slate-300" /><p className="font-semibold text-slate-700">{search ? 'No matching audiences' : 'No audiences yet'}</p><p className="mt-1 text-sm text-slate-500">{search ? 'Try a different search.' : 'Add your first audience using the form.'}</p></div> : <ul className="divide-y divide-slate-100">{visible.map(row => <li key={row.value} className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-slate-50/60"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]"><Tag size={18} /></span><div className="min-w-0 flex-1">{editing === row.value ? <form onSubmit={event => { event.preventDefault(); void updateAudience(row) }} className="flex flex-wrap items-center gap-2"><input autoFocus aria-label="Edit audience name" required maxLength={60} disabled={busy} value={editLabel} onChange={event => setEditLabel(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-blue-600" /><button disabled={busy} aria-label="Save audience" className="rounded-lg bg-blue-600 p-2 text-white disabled:opacity-50"><Check size={17} /></button><button type="button" disabled={busy} onClick={() => setEditing(null)} aria-label="Cancel editing" className="rounded-lg p-2 text-slate-500"><X size={17} /></button></form> : <span className="break-words text-sm font-semibold text-slate-800">{row.label}</span>}
{deleting === row.value && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span>Delete this audience?</span><button disabled={busy} onClick={() => void deleteAudience(row)} className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Deleting…' : 'Delete'}</button><button disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-slate-200 px-3 py-2">Cancel</button></div>}</div>
{editing !== row.value && deleting !== row.value && <div className="flex shrink-0 gap-1"><button disabled={busy} aria-label={`Edit ${row.label}`} onClick={() => { setEditing(row.value); setEditLabel(row.label); setDeleting(null) }} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"><Pencil size={17} /></button><button disabled={busy} aria-label={`Delete ${row.label}`} onClick={() => { setDeleting(row.value); setEditing(null) }} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /></button></div>}</li>)}</ul>}
          <p className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">{visible.length} of {rows.length} audiences</p>
        </section>
      </div>
    </div>
  )
}
