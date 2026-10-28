import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_POLICIES, POLICY_SLUGS, type LegalPolicy, type PolicySlug } from '@/lib/legal-policies'

export default async function LegalPolicyPage({ slug }: { slug: PolicySlug }) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('legal_policies')
    .select('slug, title, description, sections, updated_at').eq('slug', slug).maybeSingle()
  if (error) console.error(`Could not load policy ${slug}:`, error.message)
  // Keep the existing policies available before the SQL migration is installed.
  const policy: LegalPolicy = data ?? DEFAULT_POLICIES[slug]

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-[#0B2E7A]">
      <section className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-green-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#3E7A1C]">Legal & policies</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{policy.title}</h1>
          <p className="mt-6 max-w-3xl whitespace-pre-wrap text-lg leading-relaxed text-slate-600">{policy.description}</p>
          {policy.updated_at && <p className="mt-5 text-sm text-slate-500">Last updated: {new Date(policy.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>}
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <nav aria-label="Policy pages" className="mb-10 flex flex-wrap gap-3">
          {POLICY_SLUGS.map(item => <Link key={item} href={`/${item}`} prefetch={false} aria-current={item === slug ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${item === slug ? 'border-[#1857D6] bg-[#1857D6] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400'}`}>
            {DEFAULT_POLICIES[item].title}
          </Link>)}
        </nav>
        <div className="space-y-6">
          {policy.sections.map((section, index) => <section key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="break-words text-xl font-semibold sm:text-2xl">{section.title}</h2>
            <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-slate-600">{section.body}</p>
          </section>)}
        </div>
        <div className="mt-12 rounded-3xl bg-[#0B2E7A] p-8 text-white">
          <h2 className="text-xl font-semibold">Have a question about this policy?</h2>
          <Link href="/contact" className="mt-4 inline-block rounded-xl bg-[#7BC142] px-5 py-3 font-semibold text-[#0B2E7A]">Contact support</Link>
        </div>
      </div>
    </div>
  )
}
