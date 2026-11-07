import { SOCIAL_LINKS } from '@/lib/social-links'

type Platform = (typeof SOCIAL_LINKS)[number]['platform']

/** Official brand marks, drawn in each platform's own colours. */
function SocialIcon({ platform, size = 22 }: { platform: Platform; size?: number }) {
  if (platform === 'facebook') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#0866FF" />
        <path
          fill="#fff"
          d="M15.12 23.5v-8.27h2.94l.44-3.42h-3.38V9.63c0-.99.27-1.66 1.69-1.66h1.81V4.91a24 24 0 0 0-2.63-.14c-2.6 0-4.38 1.59-4.38 4.5v2.54H8.66v3.42h2.95v8.27z"
        />
      </svg>
    )
  }

  if (platform === 'instagram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <radialGradient id="ig-brand-gradient" cx="0.3" cy="1.07" r="1.3">
            <stop offset="0" stopColor="#FDF497" />
            <stop offset="0.05" stopColor="#FDF497" />
            <stop offset="0.45" stopColor="#FD5949" />
            <stop offset="0.6" stopColor="#D6249F" />
            <stop offset="0.9" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-brand-gradient)" />
        <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
      </svg>
    )
  }

  // YouTube
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FF0000"
        d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81z"
      />
      <path fill="#fff" d="M9.55 15.57V8.43L15.82 12z" />
    </svg>
  )
}

export default function SocialLinks({ dark = false }: { dark?: boolean }) {
  return (
    <nav aria-label="Social media links" className="flex flex-wrap gap-2.5">
      {SOCIAL_LINKS.map(({ platform, label, href }) => (
        <a
          key={platform}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (opens in a new tab)`}
          className={`group inline-flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BC142] ${
            dark
              ? 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10 hover:text-white'
              : 'border-slate-200 bg-white text-[#0B2E7A] shadow-sm hover:border-[#7BC142] hover:shadow-md'
          }`}
        >
          <span className="transition-transform group-hover:scale-110">
            <SocialIcon platform={platform} />
          </span>
          {label}
        </a>
      ))}
    </nav>
  )
}
