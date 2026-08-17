// componentssidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  LayoutDashboard,
  Package,
  Boxes,
  Tag,
  ShoppingCart,
  Percent,
  Wallet,
  FileBarChart2,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Loader2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// The 9 tabs of the Vendor / Seller Portal Dashboard
// ─────────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vprofile', label: 'Vendor Profile', icon: Store },
  { href: '/products', label: 'Product Management', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/pricing', label: 'Pricing', icon: Tag },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/commission', label: 'Commission', icon: Percent },
  { href: '/settlements', label: 'Settlement', icon: Wallet },
  { href: '/vreports', label: 'Reports', icon: FileBarChart2 },
]

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function Vendorsidebar({
  vendorName = 'Your Store',
  vendorId,
}: {
  vendorName?: string
  vendorId?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '' && pathname?.startsWith(href))

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090D16] px-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-white" style={{ fontFamily: 'var(--font-display)' }}>
          <span className="text-lg font-semibold tracking-tight">
            <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">D</span>
            <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">A</span>
            <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">D</span>
          </span>
          <span className="text-sm font-medium text-slate-400">Vendor Dashboard</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[280px] lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-[#090D16] border-r border-white/10"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <SidebarContent
          vendorName={vendorName}
          vendorId={vendorId}
          isActive={isActive}
          onNavigate={() => {}}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Mobile drawer */}
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
                vendorName={vendorName}
                vendorId={vendorId}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
                loggingOut={loggingOut}
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
  vendorName,
  vendorId,
  isActive,
  onNavigate,
  onLogout,
  loggingOut,
}: {
  vendorName: string
  vendorId?: string
  isActive: (href: string) => boolean
  onNavigate: () => void
  onLogout: () => void
  loggingOut: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-6 pt-6 pb-5">
        <span className="text-2xl font-semibold tracking-tight">
          <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">D</span>
          <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">A</span>
          <span className="bg-gradient-to-b from-[#1857D6] to-[#0B2E7A] bg-clip-text text-transparent">D</span>
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-white">Vendor Dashboard</span>
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
                  layoutId="vendor-sidebar-active"
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
            {vendorName.trim().charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{vendorName}</p>
            <Link href="/vprofile" onClick={onNavigate} className="text-xs text-slate-400 hover:text-slate-300">
              View profile
            </Link>
          </div>
        </div>
        <button
          onClick={() => {
            onNavigate()
            onLogout()
          }}
          disabled={loggingOut}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={16} className="animate-spin text-red-400" /> : <LogOut size={16} />}
          <span>{loggingOut ? 'Signing out...' : 'Log out'}</span>
        </button>
      </div>
    </div>
  )
}