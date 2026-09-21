'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Tag,
  LayoutDashboard,
  History,
  QrCode,
  Share2,
  Wallet,
  Users,
  CreditCard,
  Award,
  ShoppingBag,
  FileBarChart2,
  LifeBuoy,
  Video,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import MerchantScratchCard from '@/components/MerchantScratchCard'

// ─────────────────────────────────────────────────────────────────────────
// Nav Items
// ─────────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/qr-code', label: 'QR Code Management', icon: QrCode },
  { href: '/referrals', label: 'Referral Program', icon: Share2 },
  { href: '/wallet', label: 'Digital Wallet', icon: Wallet },
  { href: '/payment-history', label: 'Wallet History', icon: History },
  { href: '/engagement', label: 'Customer Engagement', icon: Users },
  { href: '/videos', label: 'Video Feed', icon: Video },
  { href: '/Managementcoupons', label: 'Coupons Management', icon: Tag },
  { href: '/payments', label: 'Monthly Bill', icon: CreditCard },
  { href: '/benefits', label: 'Merchant Benefits', icon: Award },
  { href: '/shop', label: 'E-Commerce (Shop & Orders)', icon: ShoppingBag },
  { href: '/reports', label: 'Reports', icon: FileBarChart2 },
  { href: '/quick-actions', label: 'Quick Actions / Support', icon: LifeBuoy },
]

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function Merchantsidebar({
  businessName = 'Your Business',
  merchantId,
}: {
  businessName?: string
  merchantId?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '' && pathname?.startsWith(href))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden sticky top-0 z-40 flex w-full h-16 items-center justify-between border-b border-white/10 bg-[#090D16] px-4">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-3 text-white" style={{ fontFamily: 'var(--font-display)' }}>
          <div className="relative h-8 w-24 overflow-hidden flex items-center justify-end">
            <Image
              src="/logopng.jpeg"
              alt="Logo"
              fill
              className="object-contain object-right"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Tablet icon rail (md up to lg) — always-visible, compact, icon-only sidebar */}
      <aside
        className="hidden md:flex lg:hidden md:w-[76px] md:shrink-0 md:h-screen md:sticky md:top-0 md:flex-col bg-[#090D16] border-r border-white/10"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <IconRailContent
          businessName={businessName}
          isActive={isActive}
          onLogout={handleLogout}
          onExpand={() => setMobileOpen(true)}
        />
      </aside>

      {/* Desktop sidebar (lg and up) — full sidebar with icons + labels */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[280px] lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-[#090D16] border-r border-white/10"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <SidebarContent
          businessName={businessName}
          merchantId={merchantId}
          isActive={isActive}
          onNavigate={() => {}}
          onLogout={handleLogout}
        />
      </aside>

      {/* Full slide-out drawer — used by mobile hamburger AND tablet "expand" button */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-[#090D16] border-r border-white/10 flex flex-col"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <div className="flex items-center justify-end px-4 pt-4">
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent
                businessName={businessName}
                merchantId={merchantId}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {merchantId && <MerchantScratchCard merchantId={merchantId} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tablet icon rail (compact, always-visible sidebar for md–lg viewports)
// ─────────────────────────────────────────────────────────────────────────

function IconRailContent({
  businessName,
  isActive,
  onLogout,
  onExpand,
}: {
  businessName: string
  isActive: (href: string) => boolean
  onLogout: () => void
  onExpand: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center">
      {/* Logo */}
      <Link href="" className="flex items-center justify-center pt-6 pb-5">
        <div className="relative h-9 w-9 overflow-hidden rounded-lg">
          <Image src="/logopng.jpeg" alt="Logo" fill className="object-contain" priority />
        </div>
      </Link>

      <div className="h-px w-10 bg-white/10" />

      {/* Expand button — opens the full drawer for tablet users who want labels */}
      <button
        onClick={onExpand}
        aria-label="Expand menu"
        className="mt-3 mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {/* Nav icons */}
      <nav className="flex-1 overflow-y-auto w-full px-3 py-3 space-y-1.5 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`group relative flex h-11 w-full items-center justify-center rounded-xl transition-colors ${
                active
                  ? 'bg-gradient-to-r from-[#1857D6]/20 to-[#7BC142]/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="merchant-rail-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-[#1857D6] to-[#7BC142]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={18} className={active ? 'text-[#4F8CFF]' : 'text-slate-500 group-hover:text-slate-300'} />

              {/* Hover tooltip with label */}
              <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-[#151B2B] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg border border-white/10 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="h-px w-10 bg-white/10" />

      {/* Profile / logout footer */}
      <div className="flex flex-col items-center gap-2 py-4">
        <Link
          href="/profile"
          title={businessName}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1857D6] to-[#7BC142] text-sm font-semibold text-white"
        >
          {businessName.trim().charAt(0).toUpperCase() || 'M'}
        </Link>
        <button
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared full sidebar content (desktop + mobile/tablet drawer)
// ─────────────────────────────────────────────────────────────────────────

function SidebarContent({
  businessName,
  merchantId,
  isActive,
  onNavigate,
  onLogout,
}: {
  businessName: string
  merchantId?: string
  isActive: (href: string) => boolean
  onNavigate: () => void
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo and Title Header */}
      <Link href="" onClick={onNavigate} className="flex items-center gap-3 px-6 pt-6 pb-5">
        <div className="relative h-9 w-28 overflow-hidden flex items-center justify-start shrink-0">
          <Image
            src="/logopng.jpeg"
            alt="Logo"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
        <div className="flex flex-col leading-tight border-l border-white/10 pl-3">
          <span className="text-xs font-semibold text-white tracking-wide">Merchant</span>
          <span className="text-[11px] text-slate-400">Dashboard</span>
        </div>
      </Link>

      <div className="h-px w-full bg-white/10" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-gradient-to-r from-[#1857D6]/20 to-[#7BC142]/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="merchant-sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-[#1857D6] to-[#7BC142]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={17} className={active ? 'text-[#4F8CFF]' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className="flex-1 font-medium">{item.label}</span>
              {active && <ChevronRight size={14} className="text-slate-500" />}
            </Link>
          )
        })}
      </nav>

      <div className="h-px w-full bg-white/10" />

      {/* Profile / logout footer */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1857D6] to-[#7BC142] text-sm font-semibold text-white">
            {businessName.trim().charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{businessName}</p>
            <Link href="/profile" onClick={onNavigate} className="text-xs text-slate-400 hover:text-slate-300">
              View profile
            </Link>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}