'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,Video ,
  Store,ShieldCheck,Tag,Sparkles, 
  Users,
  Truck,
  Package,
  FolderTree,
  ShoppingCart,
  Ticket,
  Trophy,
  Gift,
  Award,
  Receipt,
  CreditCard,
  Coins,
  Wallet,
  Share2,
  QrCode,
  Bell,
  Globe,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  Plus,
  Boxes,
  IndianRupee,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Flat list of Admin Links mapped from SOW Section 20
// ─────────────────────────────────────────────────────────────────────────
interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/merchants', label: 'Merchants', icon: Store },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/aproducts', label: 'Products Management', icon: Package },
    // Added Coupons here
  { href: '/coupons', label: 'Coupons Management', icon: Tag }, 
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard }, 
  { href: '/campaigns', label: 'Campaigns & Scratch Cards', icon: Ticket },
  { href: '/merchant-scratch-cards', label: 'Merchant Scratch Cards', icon: Sparkles },
  { href: '/winners', label: 'Winners', icon: Trophy },
  { href: '/gifts', label: 'Gifts', icon: Gift },
  { href: '/abenefit', label: 'Merchant Benefits', icon: Award },
  { href: '/admin-billing', label: 'Merchant Billing', icon: Receipt },
  { href: '/admin-payments', label: 'QR Payment Collection', icon: CreditCard },
  { href: '/points', label: 'Points Ledger', icon: Coins },
  // { href: '/wallet', label: 'Wallet Transactions', icon: Wallet },
  { href: '/areferrals', label: 'Referrals', icon: Share2 },
  { href: '/aqr-codes', label: 'QR Code Tracking', icon: QrCode },
  // Added Video Feed here
  { href: '/admin-videos', label: 'Video Feed', icon: Video },
  { href: '/admin-reports', label: 'Reports & Analytics', icon: BarChart3 },
  { href: '/settings', label: 'System Settings', icon: Settings },
]

// Sub-links for Products Dropdown
const PRODUCT_LINKS: NavItem[] = [
    { href: '/aproducts/add', label: 'Add Product', icon: Plus },
  { href: '/aproducts', label: 'All Products', icon: Package },
  { href: '/aproducts/inventory', label: 'Inventory', icon: Boxes },
  { href: '/aproducts/pricing', label: 'Products Points', icon: Coins },
]

export default function AdminSidebar({
  adminName = 'Super Admin',
  adminEmail = 'admin@dad.com',
}: {
  adminName?: string
  adminEmail?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(true) // Open by default to show sub-links

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin-dashboard' && pathname?.startsWith(href))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090D16] px-4">
        <Link href="/admin-dashboard" className="flex items-center gap-3 text-white" style={{ fontFamily: 'var(--font-display)' }}>
          <div className="relative h-8 w-24 overflow-hidden flex items-center justify-start">
            <Image 
              src="/logo.jpeg" 
              alt="DAD Logo" 
              fill 
              className="object-contain object-left" 
            />
          </div>
          <span className="text-sm font-medium text-slate-400">Admin Portal</span>
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
          adminName={adminName}
          adminEmail={adminEmail}
          isActive={isActive}
          onNavigate={() => {}}
          onLogout={handleLogout}
          productsOpen={productsOpen}
          setProductsOpen={setProductsOpen}
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
                adminName={adminName}
                adminEmail={adminEmail}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
                productsOpen={productsOpen}
                setProductsOpen={setProductsOpen}
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
  adminName,
  adminEmail,
  isActive,
  onNavigate,
  onLogout,
  productsOpen,
  setProductsOpen,
}: {
  adminName: string
  adminEmail: string
  isActive: (href: string) => boolean
  onNavigate: () => void
  onLogout: () => void
  productsOpen: boolean
  setProductsOpen: (val: boolean) => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo & Header Title */}
      <Link href="/admin-dashboard" onClick={onNavigate} className="flex items-center gap-3 px-6 pt-6 pb-5">
        <div className="relative h-9 w-20 overflow-hidden flex items-center justify-start shrink-0">
          <Image 
            src="/logo.jpeg" 
            alt="DAD Logo" 
            fill 
            className="object-contain object-left" 
          />
        </div>
        <div className="flex flex-col leading-tight border-l border-white/10 pl-3">
          <span className="text-xs font-semibold text-white tracking-wide">DAD Admin</span>
          <span className="text-[11px] text-slate-400">Portal</span>
        </div>
      </Link>

      <div className="h-px w-full bg-white/10" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          // Special handling for Products Dropdown
          if (item.href === '/aproducts') {
            const isParentActive = active 
            
            return (
              <div key={item.href}>
                <button
                  onClick={() => setProductsOpen(!productsOpen)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors w-full cursor-pointer ${
                    isParentActive ? 'bg-gradient-to-r from-[#1857D6]/20 to-[#7BC142]/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {isParentActive && (
                    <motion.span
                      layoutId="admin-sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-[#1857D6] to-[#7BC142]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon size={17} className={isParentActive ? 'text-[#4F8CFF]' : 'text-slate-500 group-hover:text-slate-300'} />
                  <span className="flex-1 text-left font-medium">Products Management</span>
                  <ChevronDown size={14} className={`transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 overflow-hidden"
                    >
                      {PRODUCT_LINKS.map((subItem) => {
                        const SubIcon = subItem.icon
                        const subActive = isActive(subItem.href)
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={onNavigate}
                            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${
                              subActive ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <SubIcon size={14} className={subActive ? 'text-[#4F8CFF]' : 'text-slate-600 group-hover:text-slate-400'} />
                            <span>{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          // Standard Links
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
                  layoutId="admin-sidebar-active"
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
            {adminName.trim().charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{adminName}</p>
            <p className="truncate text-xs text-slate-400">{adminEmail}</p>
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