'use client'

import { Capacitor, registerPlugin } from '@capacitor/core'
import Link from 'next/link'
import Image from 'next/image'
import SocialLinks from '@/components/SocialLinks'
import { ArrowUpRight, QrCode, ShieldCheck, Gift } from 'lucide-react'

const ExternalLinks = registerPlugin<{ openRakvih(): Promise<void> }>('FileExport')

// Same brand palette as the header:
//   blue  #1857D6 -> #0B2E7A
//   green #7BC142 -> #3E7A1C
// Display type: Fraunces via the --font-display CSS variable (layout.tsx).

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' } as const

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: '/winnervideo', label: 'Winner Video' },
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/merchant-benefits', label: 'Merchant Benefits' },
      { href: '/about', label: 'About Us' },
    ],
  },
  {
    title: 'Support & Legal',
    links: [
      { href: '/contact', label: 'Contact Us' },
      { href: '/terms', label: 'Terms & Conditions' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/refund-policy', label: 'Refund Policy' },
      { href: '/merchant-agreement', label: 'Merchant Agreement' },
    ],
  },
]

const TRUST = [
  { icon: QrCode, label: 'QR rewards' },
  { icon: ShieldCheck, label: 'OTP verified' },
  { icon: Gift, label: 'Instant points' },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#070B16] text-slate-400">
      <div className="h-[3px] w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-20 blur-3xl"
        style={{
          background:
            'radial-gradient(60% 100% at 15% 0%, #1857D6 0%, transparent 60%), radial-gradient(50% 100% at 85% 0%, #3E7A1C 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-6 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        {/* CTA card */}
        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-2xl leading-tight text-white sm:text-3xl" style={{ ...DISPLAY, fontWeight: 600 }}>
              Grow your shop with every scan.
            </h2>
            <p className="mt-2 text-sm text-slate-400">Join the merchant partner network — approval in 24–48 hours.</p>
          </div>
          <Link
            href="/#apply"
            style={DISPLAY}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3.5 text-sm text-white shadow-lg shadow-[#3E7A1C]/30 transition-transform hover:-translate-y-0.5"
          >
            Become a partner
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Brand + links */}
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12">
          <div className="col-span-2 md:col-span-1 md:pr-6">
            <Link href="/" className="group inline-flex min-w-0 shrink-0 items-center gap-1">
              <div className="relative flex h-9 w-16 items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 xl:w-20">
                <Image src="/homelg.png" alt="DAD Logo" fill sizes="(min-width: 1280px) 80px, 64px" className="object-contain" />
              </div>
              <span
                className="whitespace-nowrap bg-gradient-to-r from-[#4F8CFF] to-[#7BC142] bg-clip-text text-lg tracking-tight text-transparent sm:text-xl"
                style={{ ...DISPLAY, fontWeight: 600 }}
              >
                Merchant app
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Empowering local merchants and connecting customers with seamless shopping, rewards, and exclusive digital experiences.
            </p>
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Follow us</p>
              <SocialLinks dark />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {TRUST.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                >
                  <Icon size={13} className="text-[#7BC142]" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-xs uppercase tracking-[0.18em] text-white/90" style={{ ...DISPLAY, fontWeight: 600 }}>
                {col.title}
              </h3>
              <ul className="space-y-3 text-sm" style={DISPLAY}>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="group inline-flex min-w-0 shrink-0 items-center gap-1 transition-colors hover:text-white">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-600 transition-all group-hover:w-3 group-hover:bg-[#7BC142]" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} MerchantApp. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Designed and Developed by</span>
            <a
              href="https://rakvih.in/"
              onClick={event => {
                if (Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('FileExport')) {
                  event.preventDefault()
                  void ExternalLinks.openRakvih().catch(() => { window.open('https://rakvih.in/', '_blank', 'noopener,noreferrer') })
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-400 underline underline-offset-4 transition-colors hover:text-[#7BC142]"
            >
              Rakvih
            </a>
          </p>
          <div className="flex items-center gap-5" style={DISPLAY}>
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
