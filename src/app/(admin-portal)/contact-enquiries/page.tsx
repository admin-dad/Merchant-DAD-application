'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, RefreshCw, Search, Loader2, MessageSquare, Phone, CalendarDays, ChevronLeft, ChevronRight, Inbox, AlertCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/client'

type Enquiry = { id: string; full_name: string; email: string; phone: string; topic: string; message: string; created_at: string }
const PAGE_SIZE = 25

export default function ContactEnquiries() {
  const [rows, setRows] = useState<Enquiry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [expanded, setExpanded] = useState<string[]>([])
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, count, error } = await createAdminClient().from('contact_enquiries').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (error) throw error
      setRows(data ?? []); setCount(count ?? 0)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load enquiries.') }
    finally { setLoading(false) }
  }, [page])
  useEffect(() => { void load() }, [load])
  const visible = rows.filter(row => [row.full_name, row.email, row.phone, row.topic, row.message].some(value => value.toLowerCase().includes(search.trim().toLowerCase())))
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      <header className="admin-page-header mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0B0F19] to-[#1857D6] text-white shadow-lg shadow-blue-500/20"><MessageSquare size={26} /></div>
          <div><h1>Contact Enquiries</h1><p>Connect with visitors and respond to questions from your website.</p></div>
        </div>
        <button disabled={loading} onClick={() => void load()} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{loading ? 'Refreshing…' : 'Refresh enquiries'}</button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {[{ label: 'Total enquiries', value: count, icon: Inbox, color: 'bg-blue-50 text-blue-600' }, { label: 'On this page', value: rows.length, icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' }].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={21} /></span><div><p className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</p><p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p></div></div>)}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm" aria-labelledby="enquiry-inbox-title">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 id="enquiry-inbox-title" className="text-base font-bold text-slate-900">Enquiry inbox</h2><p className="mt-1 text-xs text-slate-500">Newest first · Search names, contact details, topics or messages on this page.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{visible.length} shown</span></div>
          <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-3.5 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search current page" placeholder="Search enquiries on this page…" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-black outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" /></div>
        </div>
        {error && <div role="alert" className="m-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
        {loading ? <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500"><Loader2 size={24} className="animate-spin text-blue-600" />Loading enquiries…</div> : !visible.length ? <div className="px-6 py-20 text-center"><Inbox size={38} className="mx-auto mb-4 text-slate-300" /><h3 className="font-semibold text-slate-800">{search ? 'No matching enquiries' : 'Your inbox is clear'}</h3><p className="mt-2 text-sm text-slate-500">{search ? 'Try another search or clear the search field.' : 'Messages submitted through the contact page will appear here.'}</p></div> : <div className="space-y-4 bg-slate-50/40 p-4 sm:p-6">{visible.map(row => {
          const isExpanded = expanded.includes(row.id)
          return <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 text-lg font-bold text-blue-700">{row.full_name.trim().charAt(0).toUpperCase() || '?'}</span><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{row.full_name}</h3><span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{row.topic}</span></div></div>
              <time dateTime={row.created_at} className="inline-flex items-center gap-1.5 self-start text-xs text-slate-400"><CalendarDays size={14} />{new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3"><p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 ${isExpanded ? '' : 'line-clamp-4'}`}>{row.message}</p>{row.message.length > 200 && <button aria-expanded={isExpanded} onClick={() => setExpanded(previous => isExpanded ? previous.filter(id => id !== row.id) : [...previous, row.id])} className="mt-2 text-xs font-semibold text-blue-600">{isExpanded ? 'Show less' : 'Read full message'}</button>}</div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><a href={`mailto:${row.email}`} className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Mail size={15} className="shrink-0" /><span className="break-all">{row.email}</span></a><a href={`tel:${row.phone.replace(/[^+0-9]/g, '')}`} className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Phone size={15} />{row.phone}</a></div>
          </article>
        })}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500"><span>Page {page + 1} of {pages}</span><div className="flex gap-2"><button disabled={loading || page === 0} onClick={() => setPage(value => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={15} />Previous</button><button disabled={loading || (page + 1) * PAGE_SIZE >= count} onClick={() => setPage(value => value + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next<ChevronRight size={15} /></button></div></div>
      </section>
    </div>
  )
}
