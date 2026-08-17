'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  LifeBuoy,
  LayoutDashboard,
  User,
  Store,
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
  FileBarChart2,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  PhoneCall,
  Mail,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
  email?: string
}

export default function QuickActionsSupportPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch Merchant Profile ──────────────────────────────────────────
  useEffect(() => {
    const fetchMerchant = async () => {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, business_name')
        .eq('user_id', user.id)
        .single()

      if (merchantError || !merchantData) {
        setError('Could not load your merchant profile.')
      } else {
        setMerchant({ ...merchantData, email: user.email })
      }
      setLoading(false)
    }

    fetchMerchant()
  }, [router, supabase])

  // All platform navigation shortcuts
  const navigationShortcuts = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of your performance and recent activities.' },
    { href: '/profile', label: 'My Profile', icon: User, description: 'Manage your personal login and account credentials.' },
    { href: '/shop-details', label: 'Business / Shop Details', icon: Store, description: 'Update store info, address, timings, and categories.' },
    { href: '/qr-code', label: 'QR Code Management', icon: QrCode, description: 'Download or manage your store check-in and payment QR.' },
    { href: '/referrals', label: 'Referral Program', icon: Share2, description: 'Invite peer merchants and earn rewarding bonus points.' },
    { href: '/points-rewards', label: 'Points & Rewards Wallet', icon: Gift, description: 'Track your loyalty points balance and redemption history.' },
    { href: '/wallet', label: 'Digital Wallet', icon: Wallet, description: 'Monitor digital cash transactions, balances, and payouts.' },
    { href: '/engagement', label: 'Customer Engagement', icon: Users, description: 'Connect with your consumer base, run campaigns & offers.' },
    { href: '/scratch-cards', label: 'Scratch Card Participation', icon: Ticket, description: 'View active scratch card reward campaigns and winnings.' },
    { href: '/billing', label: 'Merchant Billing Summary', icon: Receipt, description: 'Review system subscriptions, usage quotas, and invoices.' },
    { href: '/payments', label: 'Payment Processing', icon: CreditCard, description: 'Track payment gateways, payouts, and customer checkouts.' },
    { href: '/benefits', label: 'Merchant Benefits', icon: Award, description: 'Explore special perks, discounts, and partner tier rewards.' },
    { href: '/shop', label: 'E-Commerce (Shop & Orders)', icon: ShoppingBag, description: 'Browse B2B/B2C catalog and manage product orders.' },
    { href: '/reports', label: 'Reports', icon: FileBarChart2, description: 'Deep-dive analytics, financial logs, and exportable charts.' },
  ]

  // ── Loading State UI ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State UI ──────────────────────────────────────────────────
  if (error && !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Support Page Error</h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner matching Profile page styling */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <LifeBuoy size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Quick Actions & Support
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  14 Shortcuts Available
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Instantly navigate through platform features or contact our support desk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left side shortcuts (7 cols), Right side support desk (5 cols) - matching profile proportions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        
        {/* Navigation Shortcuts Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h2 className="text-base  font-semibold text-slate-900">Platform Navigation Shortcuts</h2>
              <p className="text-xs text-slate-500">Click any card to jump directly to that section.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {navigationShortcuts.map((item, index) => {
              const IconComponent = item.icon
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => router.push(item.href)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
                        <IconComponent size={20} />
                      </div>
                      <ArrowRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#1857D6]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#1857D6] transition-colors">
                        {item.label}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Support & Help Center Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Contact Support</h2>
              <p className="text-xs text-slate-500">Get assistance from our helpdesk team.</p>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6 sm:p-8"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C]">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Need Immediate Help?</h3>
                <p className="text-xs text-slate-500">Our assistance team is available.</p>
              </div>
            </div>

            {/* Support Options List */}
            <div className="space-y-4">
              <a 
                href="mailto:support@rakvih.com" 
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-blue-200 hover:bg-white transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
                  <Mail size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Support</p>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-[#1857D6] truncate">support@rakvih.com</p>
                </div>
                <ExternalLink size={14} className="text-slate-400 shrink-0" />
              </a>

              <a 
                href="tel:+919876543210" 
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-emerald-200 hover:bg-white transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C]">
                  <PhoneCall size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Helpline Number</p>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-[#3E7A1C] truncate">+91 98765 43210</p>
                </div>
                <ExternalLink size={14} className="text-slate-400 shrink-0" />
              </a>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-emerald-50/30 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <MessageSquare size={16} className="text-[#1857D6]" />
                  Live Merchant Chat
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Have technical issues with QR codes, wallet payouts, or store settings? Connect directly with our agents.
                </p>
                <button 
                  onClick={() => alert('Live Chat widget will open shortly.')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-3 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg cursor-pointer"
                >
                  Start Live Chat
                </button>
              </div>
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  )
}