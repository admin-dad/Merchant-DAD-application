import Link from 'next/link'

// Same brand palette as the header:
//   blue  #1857D6 -> #0B2E7A
//   green #7BC142 -> #3E7A1C
//
// Display type: Fraunces, weights 500 / 600, normal style,
// via the --font-display CSS variable (set globally in layout.tsx).

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: '/shop', label: 'Shop All Products' },
      { href: '/categories', label: 'Product Categories' },
      { href: '/rewards', label: 'Rewards & Points' },
      { href: '/referral-program', label: 'Referral Program' },
      { href: '/faq', label: 'FAQ' },
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
  {
    title: 'Merchants',
    links: [
      { href: '/merchant-benefits', label: 'Merchant Benefits' },
      { href: '/merchant-register', label: 'Partner Registration' },
      { href: '/merchant-login', label: 'Merchant Dashboard Login' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative bg-[#070B16] text-slate-400">
      {/* Ribbon accent — mirrors the header's swoosh line */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />

      {/* Soft brand glow, kept subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.15] blur-3xl"
        style={{
          background:
            'radial-gradient(60% 100% at 15% 0%, #1857D6 0%, transparent 60%), radial-gradient(50% 100% at 85% 0%, #3E7A1C 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">

          {/* Column 1: Brand */}
          <div className="space-y-4 md:pr-6">
            <span
              className="text-xl tracking-tight bg-gradient-to-r from-[#4F8CFF] to-[#7BC142] bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontStyle: 'normal' }}
            >
              MerchantApp
            </span>
            <p className="text-sm leading-relaxed text-slate-400">
              Empowering local merchants and connecting customers with seamless shopping, rewards, and exclusive digital experiences.
            </p>
          </div>

          {/* Columns 2-4: Links */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3
                className="mb-4 text-xs uppercase tracking-widest text-white/90"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontStyle: 'normal' }}
              >
                {col.title}
              </h3>
              <ul
                className="space-y-2.5 text-sm"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' }}
              >
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 transition-colors hover:text-white"
                    >
                      <span className="h-1 w-1 rounded-full bg-slate-600 transition-colors group-hover:bg-[#7BC142]" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} MerchantApp. All rights reserved.
          </p>

          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>Designed and Developed by</span>
            <a
              href="https://rakvih.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-400 hover:text-[#7BC142] transition-colors underline underline-offset-4"
            >
              Rakvih
            </a>
          </p>

          <div
            className="flex items-center gap-5 text-xs text-slate-500"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' }}
          >
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}