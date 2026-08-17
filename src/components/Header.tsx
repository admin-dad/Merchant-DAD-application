'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowUpRight, Sparkles, UserCheck } from 'lucide-react'
import MerchantModal from '@/components/modals/Merchant'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/shop', label: 'Shop' },
  { href: '/merchant-benefits', label: 'Merchant Benefits' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)

  return (
    <>
      {/* NOTE: changed from `sticky top-0` to `fixed top-0 left-0 right-0`.
          `position: sticky` breaks whenever an ancestor has
          `overflow-x-hidden` (or any overflow other than visible), because
          that ancestor becomes the sticky element's scroll container
          instead of the viewport. `fixed` sidesteps that problem entirely.
          Because the header is now fixed (taken out of normal flow), we
          add a spacer div below of the same height so page content
          doesn't get hidden underneath it. */}
      <header className="fixed inset-x-0 top-0 z-50 w-full font-sans">
        {/* Sleek Dark Glass Panel with Increased Height */}
        <div className="relative border-b border-white/10 bg-[#090D16]/85 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#090D16]/75 shadow-lg shadow-black/20">
          <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

            {/* DAP Logo Replica */}
            <Link href="/" className="flex shrink-0 items-center gap-3.5 group py-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center tracking-wider select-none text-3xl sm:text-4xl"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontStyle: 'normal',
                }}
              >
                <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent drop-shadow-sm tracking-tight">
                  D
                </span>
                <div className="relative inline-flex items-center justify-center mx-[-1px]">
                  <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent tracking-tight">
                    A
                  </span>
                  <div
                    className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderBottom: '9px solid #7BC142',
                    }}
                  />
                  <div className="absolute -bottom-1 -left-3.5 -right-3.5 h-2.5 bg-gradient-to-r from-[#3E7A1C] via-[#7BC142] to-[#3E7A1C] rounded-full transform -rotate-3 shadow-sm" />
                </div>
                <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent tracking-tight">
                  D
                </span>
              </motion.div>
            </Link>

            {/* Primary Navigation Links */}
            <nav
              className="hidden lg:flex items-center gap-1.5 text-[15px] text-slate-300"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' }}
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative px-4 py-2.5 transition-colors hover:text-white"
                >
                  <span>{link.label}</span>
                  <span className="pointer-events-none absolute left-4 right-4 -bottom-[2px] h-[2px] scale-x-0 origin-left rounded-full bg-gradient-to-r from-[#1857D6] to-[#7BC142] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>

            {/* Header Action Buttons */}
            <div
              className="hidden lg:flex items-center gap-3.5"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' }}
            >

              {/* Become a Merchant Button triggers MerchantModal */}
              <button
                onClick={() => setIsMerchantModalOpen(true)}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3 text-sm text-white shadow-[0_4px_16px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.6)] active:translate-y-0 cursor-pointer"
              >
                <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Sparkles size={16} />
                <span>Become a Merchant</span>
              </button>
            </div>

            {/* Mobile Menu Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1857D6]"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </motion.button>
          </div>

          <div className="h-[2px] w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142] shadow-[0_0_12px_rgba(123,193,66,0.4)]" />
        </div>

        {/* Animated Mobile Dropdown Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden overflow-hidden border-b border-white/10 bg-[#090D16]/95 backdrop-blur-2xl shadow-2xl"
            >
              <nav
                className="flex flex-col gap-1 px-5 py-5 text-[15px] text-slate-300"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontStyle: 'normal' }}
              >
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 transition-all hover:bg-white/5 hover:text-white flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight size={16} className="text-slate-500" />
                  </Link>
                ))}

                <div className="mt-4 flex flex-col gap-2.5 border-t border-white/10 pt-4">

                  {/* Mobile Merchant Trigger */}
                  <button
                    onClick={() => {
                      setOpen(false)
                      setIsMerchantModalOpen(true)
                    }}
                    className="relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-3.5 text-center text-white shadow-lg shadow-[#3E7A1C]/30 w-full cursor-pointer"
                  >
                    <Sparkles size={16} />
                    <span>Become a Merchant</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer so fixed header doesn't overlap page content.
          Matches the header's collapsed height (h-24 = 96px + 2px border strip). */}
      <div className="h-[98px] w-full" aria-hidden="true" />

      {/* Render both modal components independently */}
      <MerchantModal isOpen={isMerchantModalOpen} onClose={() => setIsMerchantModalOpen(false)} />
    </>
  )
}