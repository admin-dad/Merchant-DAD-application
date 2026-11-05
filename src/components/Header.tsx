'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react'
import MerchantModal from '@/components/modals/Merchant'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/winnervideo', label: 'Winner Video' },
  { href: '/merchant-benefits', label: 'Merchant Benefits' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
]

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' } as const

export default function Header() {
  const [open, setOpen] = useState(false)
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 w-full font-sans">
        <div className="relative border-b border-white/10 bg-[#090D16]/85 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#090D16]/75">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[68px] xl:px-8">
            {/* Brand */}
            <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-1">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex h-9 w-16 items-center justify-center overflow-hidden xl:w-20"
              >
                <Image
                  src="/homelg.png"
                  alt="DAD Logo"
                  fill
                  sizes="(min-width: 1280px) 80px, 64px"
                  className="object-contain"
                  priority
                />
              </motion.div>
              <span
                className="whitespace-nowrap bg-gradient-to-r from-[#4F8CFF] to-[#7BC142] bg-clip-text text-lg tracking-tight text-transparent sm:text-xl"
                style={{ ...DISPLAY, fontWeight: 600 }}
              >
                Merchant app
              </span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden shrink-0 items-center gap-0.5 text-[13px] text-slate-300 lg:flex xl:text-[14px]" style={DISPLAY}>
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group relative shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 transition-colors hover:text-white xl:px-3.5 ${active ? 'text-white' : ''}`}
                  >
                    <span>{link.label}</span>
                    <span
                      className={`pointer-events-none absolute inset-x-2.5 -bottom-[1px] h-[2px] origin-left rounded-full bg-gradient-to-r from-[#1857D6] to-[#7BC142] transition-transform duration-300 ease-out xl:inset-x-3.5 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                    />
                  </Link>
                )
              })}
            </nav>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setIsMerchantModalOpen(true)}
                style={DISPLAY}
                className="group relative hidden cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-4 py-2.5 text-xs text-white shadow-[0_4px_16px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.6)] active:translate-y-0 sm:inline-flex xl:px-5 xl:text-sm"
              >
                <span className="absolute inset-0 h-full w-full -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
                <Sparkles size={15} />
                <span>Become a partner</span>
              </button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                aria-label="Toggle menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1857D6] lg:hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={open ? 'x' : 'menu'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {open ? <X size={20} /> : <Menu size={20} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          <div className="h-[2px] w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142] shadow-[0_0_12px_rgba(123,193,66,0.4)]" />
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 top-[66px] -z-10 bg-black/40 backdrop-blur-sm lg:hidden"
              />
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mx-3 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1322]/95 shadow-2xl backdrop-blur-2xl lg:hidden"
              >
                <nav className="grid grid-cols-2 gap-2 p-3 text-[14px] text-slate-300" style={DISPLAY}>
                  {NAV_LINKS.map((link, i) => {
                    const active = isActive(link.href)
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
                            active
                              ? 'border-[#7BC142]/40 bg-[#7BC142]/10 text-white'
                              : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{link.label}</span>
                          <ArrowUpRight size={14} className={active ? 'text-[#7BC142]' : 'text-slate-500'} />
                        </Link>
                      </motion.div>
                    )
                  })}
                </nav>
                <div className="border-t border-white/10 p-3">
                  <button
                    onClick={() => {
                      setOpen(false)
                      setIsMerchantModalOpen(true)
                    }}
                    style={DISPLAY}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-3.5 text-white shadow-lg shadow-[#3E7A1C]/30"
                  >
                    <Sparkles size={16} />
                    <span>Become a partner — it&apos;s free</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer matching the fixed header height (bar + 2px ribbon) */}
      <div className="h-[66px] w-full lg:h-[70px]" aria-hidden="true" />

      <MerchantModal isOpen={isMerchantModalOpen} onClose={() => setIsMerchantModalOpen(false)} />
    </>
  )
}
