import { SOCIAL_LINKS } from '@/lib/social-links'

function SocialIcon({ platform }: { platform: (typeof SOCIAL_LINKS)[number]['platform'] }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {platform === 'facebook' ? <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> : platform === 'instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></> : <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3z" fill="currentColor" stroke="none" /></>}
  </svg>
}
export default function SocialLinks({ dark = false }: { dark?: boolean }) {
  return (
    <nav aria-label="Social media links" className="flex flex-wrap gap-2.5">
      {SOCIAL_LINKS.map(({ platform, label, href }) => {
        return <a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BC142] ${dark ? 'border-white/15 bg-white/5 text-slate-200 hover:border-[#7BC142]/50 hover:bg-white/10 hover:text-white' : 'border-slate-200 bg-white text-[#0B2E7A] shadow-sm hover:border-[#7BC142] hover:bg-[#F2F8EB]'}`}>
          <SocialIcon platform={platform} />{label}
        </a>
      })}
    </nav>
  )
}
