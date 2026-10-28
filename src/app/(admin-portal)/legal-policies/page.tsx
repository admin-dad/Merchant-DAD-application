'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/client'
import { DEFAULT_POLICIES, POLICY_SLUGS, type LegalPolicy, type PolicySlug } from '@/lib/legal-policies'

export default function LegalPoliciesAdminPage() {
  const [policies, setPolicies] = useState<Record<PolicySlug, LegalPolicy>>(DEFAULT_POLICIES)
  const [selected, setSelected] = useState<PolicySlug>('terms')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirtySlugs, setDirtySlugs] = useState<PolicySlug[]>([])
  const dirty = dirtySlugs.includes(selected)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const policy = policies[selected]

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data, error } = await createAdminClient().from('legal_policies')
          .select('slug, title, description, sections, updated_at')
        if (error) throw error
        if (!active) return
        const loaded = { ...DEFAULT_POLICIES }
        for (const row of data ?? []) {
          if (POLICY_SLUGS.includes(row.slug as PolicySlug)) loaded[row.slug as PolicySlug] = row as LegalPolicy
        }
        setPolicies(loaded)
      } catch {
        if (active) setError('Could not load policies. Run the legal_policies.sql migration in Supabase and check your admin access, then reload this page.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirtySlugs.length) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirtySlugs])

  const update = (changes: Partial<LegalPolicy>) => {
    setPolicies(previous => ({ ...previous, [selected]: { ...previous[selected], ...changes } }))
    setDirtySlugs(previous => previous.includes(selected) ? previous : [...previous, selected])
    setNotice(null)
  }

  const selectPolicy = (slug: PolicySlug) => {
    if (slug === selected) return
    setSelected(slug)
    setNotice(null)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!policy.title.trim() || !policy.description.trim() || !policy.sections.length || policy.sections.some(s => !s.title.trim() || !s.body.trim())) {
      setError('Enter a title, introduction, and at least one complete section.')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await createAdminClient().from('legal_policies').upsert({
        slug: selected,
        title: policy.title.trim(),
        description: policy.description.trim(),
        sections: policy.sections.map(s => ({ title: s.title.trim(), body: s.body.trim() })),
      }, { onConflict: 'slug' }).select('slug, title, description, sections, updated_at').single()
      if (error) throw error
      setPolicies(previous => ({ ...previous, [selected]: data as LegalPolicy }))
      setDirtySlugs(previous => previous.filter(slug => slug !== selected))
      setNotice('Published successfully. Open or refresh the public page to see your changes.')
    } catch {
      setError('Could not publish. Check that the SQL migration is installed and your account exists in the admin table. Your edits are still here.')
    } finally { setSaving(false) }
  }

  if (loading) return <div role="status" className="flex items-center gap-3 py-20 text-slate-600"><Loader2 className="animate-spin" />Loading policies…</div>

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex items-start gap-4 sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
            <FileText size={30} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Legal Policies</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Edit your website policies. Save and publish updates the corresponding public page.</p>
          </div>
        </div>
      </header>
      <section aria-labelledby="policy-selector-heading" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="policy-selector-heading" className="text-base font-semibold text-slate-900">Choose a policy</h2>
        <p className="mt-1 text-sm text-slate-500">Select a page to manage its content.</p>
        <nav aria-label="Choose policy" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {POLICY_SLUGS.map(slug => <button key={slug} type="button" disabled={saving} onClick={() => selectPolicy(slug)} aria-pressed={selected === slug}
            className={`group flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1857D6]/50 disabled:opacity-50 ${selected === slug ? 'border-[#1857D6] bg-blue-50 shadow-sm shadow-blue-500/10' : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/50'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected === slug ? 'bg-[#1857D6] text-white' : 'bg-white text-slate-500 shadow-sm'}`}><FileText size={19} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold leading-5 ${selected === slug ? 'text-[#0B2E7A]' : 'text-slate-700'}`}>{DEFAULT_POLICIES[slug].title}</span>
              <span className="mt-1 block break-all text-xs text-slate-500">/{slug}</span>
              {dirtySlugs.includes(slug) && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Unsaved changes</span>}
            </span>
          </button>)}
        </nav>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
            <p className="text-sm font-medium text-slate-500">Public page: /{selected}{dirty ? ' · Unsaved changes' : ''}</p>
            <a href={`/${selected}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1857D6] transition-colors hover:bg-blue-50">View page <ExternalLink size={15} /></a>
          </div>
          <label className="block text-sm font-semibold text-slate-700">Page title
            <input required maxLength={200} value={policy.title} onChange={e => update({ title: e.target.value })} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Introduction
            <textarea required maxLength={2000} rows={3} value={policy.description} onChange={e => update({ description: e.target.value })} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
          </label>
          <p className="text-sm text-slate-500">Use plain text. Line breaks are preserved on the public page.</p>
          {policy.sections.map((section, index) => <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Section {index + 1}</h2>
              <button type="button" disabled={policy.sections.length === 1} onClick={() => update({ sections: policy.sections.filter((_, i) => i !== index) })} className="inline-flex items-center gap-1 text-sm text-red-600 disabled:opacity-40"><Trash2 size={15} />Remove</button>
            </div>
            <label className="block text-sm font-medium text-slate-600">Heading
              <input required maxLength={200} value={section.title} onChange={e => update({ sections: policy.sections.map((s, i) => i === index ? { ...s, title: e.target.value } : s) })} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900" />
            </label>
            <label className="block text-sm font-medium text-slate-600">Content
              <textarea required maxLength={20000} rows={5} value={section.body} onChange={e => update({ sections: policy.sections.map((s, i) => i === index ? { ...s, body: e.target.value } : s) })} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900" />
            </label>
          </div>)}
          <button type="button" disabled={policy.sections.length >= 100} onClick={() => update({ sections: [...policy.sections, { title: '', body: '' }] })} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700"><Plus size={17} />Add section</button>
          <div className="border-t border-slate-100 pt-6">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'Publishing…' : 'Save & publish'}</button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
