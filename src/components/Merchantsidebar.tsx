'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Store,
  LayoutDashboard,
  QrCode,
  Share2,
  Gift,
  Wallet,
  Users,
  Ticket,
  Receipt,
  CreditCard,
  Award,
  ShoppingBag,
  Bell,
  FileBarChart2,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react'

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
  { href: '/shop-details', label: 'Business / Shop Details', icon: Store },
  { href: '/qr-code', label: 'QR Code Management', icon: QrCode },
  { href: '/referrals', label: 'Referral Program', icon: Share2 },
  //{ href: '/points-rewards', label: 'Points & Rewards Wallet', icon: Gift },
  { href: '/wallet', label: 'Digital Wallet', icon: Wallet },
  { href: '/engagement', label: 'Customer Engagement', icon: Users },
  { href: '/scratch-cards', label: 'Scratch Card Participation', icon: Ticket },
  //{ href: '/billing', label: 'Merchant Billing Summary', icon: Receipt },
  { href: '/payments', label: 'Scan Payment Processing', icon: CreditCard },
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
    router.push('/') // Change to your merchant login route if different (e.g., '/merchant/login')
  }

  return (
    <>
      {/* Mobile / Half-Desktop topbar (triggers below lg breakpoint) */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090D16] px-4">
        <Link href="" className="flex items-center gap-3 text-white" style={{ fontFamily: 'var(--font-display)' }}>
          <div className="relative h-8 w-24 overflow-hidden flex items-center justify-start">
            <Image 
              src="/logo.jpeg" 
              alt="Logo" 
              fill 
              className="object-contain object-left" 
            />
          </div>
          <span className="text-sm font-medium text-slate-400">Merchant Dashboard</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Desktop sidebar (Hidden below lg, strict flex on large screens) */}
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

      {/* Mobile / Tablet slide-out drawer */}
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
              className="absolute left-0 top-0 h-full w-[280px] bg-[#090D16] border-r border-white/10 flex flex-col"
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
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared sidebar content (desktop + mobile drawer)
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
        <div className="relative h-9 w-20 overflow-hidden flex items-center justify-start shrink-0">
          <Image 
            src="/logo.jpeg" 
            alt="Logo" 
            fill 
            className="object-contain object-left" 
          />
        </div>
        <div className="flex flex-col leading-tight border-l border-white/10 pl-3">
          <span className="text-xs font-semibold text-white tracking-wide">Merchant</span>
          <span className="text-[11px] text-slate-400">Dashboard</span>
        </div>
      </Link>

      <div className="h-px w-full bg-white/10" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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