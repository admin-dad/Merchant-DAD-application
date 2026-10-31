'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_POLICIES, type LegalPolicy } from '@/lib/legal-policies'

type ScanPolicySlug = 'terms' | 'customer-agreement'
type PolicyResult =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; policy: LegalPolicy }

export default function ScanLegalPolicyModal({ slug, onClose }: { slug: ScanPolicySlug; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [result, setResult] = useState<PolicyResult>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    dialog.current?.showModal()
    let active = true
    const load = async () => {
      try {
        // Fetch on each opening: this is the same row used by the public policy page.
        const { data, error } = await createClient().from('legal_policies')
          .select('slug, title, description, sections, updated_at').eq('slug', slug).maybeSingle()
        if (error || !data) throw error ?? new Error('Policy has not been published.')
        if (active) setResult({ status: 'ready', policy: data as LegalPolicy })
      } catch {
        if (active) setResult({ status: 'error' })
      }
    }
    void load()
    return () => { active = false }
  }, [slug, attempt])

  const title = result.status === 'ready' ? result.policy.title : DEFAULT_POLICIES[slug].title
  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="scan-policy-title"
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm">
      <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5 sm:p-6">
        <h2 id="scan-policy-title" className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close policy" className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
      </header>
      <div className="p-5 sm:p-6">
        {result.status === 'loading' && <p role="status" className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={20} className="animate-spin" />Loading policy…</p>}
        {result.status === 'error' && <div role="alert" className="space-y-3 text-sm text-slate-600">
          <p>This policy could not be loaded. Please check your connection and try again.</p>
          <button type="button" onClick={() => { setResult({ status: 'loading' }); setAttempt(previous => previous + 1) }} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white">Try again</button>
        </div>}
        {result.status === 'ready' && <div className="space-y-5 text-sm leading-relaxed text-slate-600">
          <p className="whitespace-pre-wrap break-words">{result.policy.description}</p>
          {result.policy.updated_at && <p className="text-xs text-slate-400">Last updated: {new Date(result.policy.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>}
          {result.policy.sections.map((section, index) => <section key={index}>
            <h3 className="mb-2 break-words font-semibold text-slate-900">{section.title}</h3>
            <p className="whitespace-pre-wrap break-words">{section.body}</p>
          </section>)}
        </div>}
      </div>
      <footer className="border-t border-slate-100 p-5 sm:px-6">
        <button type="button" onClick={() => dialog.current?.close()} className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold hover:bg-slate-200">Close</button>
      </footer>
    </dialog>
  )
}
