'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  Smartphone,
  Clock,
  Award,
  Ticket,
  Eye,
  Gift,
  CheckCircle2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
}

interface ScanRecord {
  id: string
  customer_name: string | null
  customer_phone: string | null
  status: string // 'Pending', 'Reward Won', 'No Win'
  prize_won: string | null
  created_at: string
}

type ActivityTab = 'activity' | 'winners'

export default function CustomerEngagementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActivityTab>('activity')

  // ── Fetch Merchant Data & All Scans (covers engagement + scratch cards) ─
  useEffect(() => {
    const fetchData = async () => {
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
        setLoading(false)
        return
      }

      setMerchant(merchantData)

      const { data: scanData, error: scanError } = await supabase
        .from('qr_scans')
        .select('id, customer_name, customer_phone, status, prize_won, created_at')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (!scanError && scanData) {
        setScans(scanData as ScanRecord[])
      }

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  // ── Calculate Engagement Metrics ─────────────────────────────────────
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  let todayScans = 0
  let yesterdayScans = 0
  let weeklyScans = 0
  let monthlyScans = 0
  const uniqueCustomers = new Set()
  const customerScanCount: Record<string, number> = {}

  scans.forEach((scan) => {
    const scanDate = new Date(scan.created_at)

    if (scanDate >= startOfToday) todayScans++
    if (scanDate >= startOfYesterday && scanDate < startOfToday) yesterdayScans++
    if (scanDate >= startOfWeek) weeklyScans++
    if (scanDate >= startOfMonth) monthlyScans++

    const identifier = scan.customer_phone || scan.customer_name
    if (identifier) {
      uniqueCustomers.add(identifier)
      customerScanCount[identifier] = (customerScanCount[identifier] || 0) + 1
    }
  })

  const totalScans = scans.length
  const totalRegisteredCustomers = uniqueCustomers.size

  let returningCustomers = 0
  Object.values(customerScanCount).forEach(count => {
    if (count > 1) returningCustomers++
  })
  const newCustomers = totalRegisteredCustomers - returningCustomers

  // ── Calculate Scratch Card Metrics (same qr_scans dataset) ───────────
  const totalIssued = scans.length
  const totalOpened = scans.filter(s => s.status === 'Reward Won' || s.status === 'No Win').length
  const totalWinners = scans.filter(s => s.status === 'Reward Won').length
  const pendingRewards = scans.filter(s => s.status === 'Pending')
  const winnerScans = scans.filter(s => s.status === 'Reward Won')

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // ── Loading State UI ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State UI ──────────────────────────────────────────────────
  if (error || !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Engagement Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load customer engagement data.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 bg-white sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Users size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Customer Engagement & Rewards
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track scans, customer visits, and scratch card reward participation — all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Activity Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today's Scans</span>
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{todayScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Customer interactions today</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yesterday</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Calendar size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{yesterdayScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Scans completed yesterday</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly Scans</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Calendar size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{weeklyScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Last 7 days total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Scans</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Calendar size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{monthlyScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Last 30 days total</p>
        </motion.div>
      </div>

      {/* Customer Breakdown Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
            <Users size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Total Customers</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{totalRegisteredCustomers}</p>
            <p className="text-xs font-medium text-slate-400">Unique visitors</p>
          </div>
        </div>

        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C] transition-transform group-hover:scale-105">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">New Customers</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{newCustomers}</p>
            <p className="text-xs font-medium text-slate-400">First-time visitors</p>
          </div>
        </div>

        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-purple-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Returning Customers</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{returningCustomers}</p>
            <p className="text-xs font-medium text-slate-400">Scanned more than once</p>
          </div>
        </div>
      </div>

      {/* Scratch Card Stats */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Issued</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Ticket size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalIssued}</h3>
          <p className="text-xs text-slate-400 mt-1">Cards generated via QR scans</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Opened</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Eye size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalOpened}</h3>
          <p className="text-xs text-slate-400 mt-1">Customers who played</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Winners</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><Award size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalWinners}</h3>
          <p className="text-xs text-slate-400 mt-1">Successful reward claims</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Status</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{pendingRewards.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Awaiting scratch/fulfillment</p>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

        {/* Left Column: Activity / Winners Feed (7/12) — tabbed to avoid duplicating the list twice */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {activeTab === 'activity' ? <Clock size={18} /> : <Award size={18} />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {activeTab === 'activity' ? 'Recent Customer Activity' : 'Lucky Winners'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTab === 'activity'
                    ? 'Live feed of the latest QR scans at your shop.'
                    : 'Customers who won a reward at your shop.'}
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab('activity')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'activity' ? 'bg-white text-[#1857D6] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('winners')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'winners' ? 'bg-white text-[#1857D6] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Winners ({totalWinners})
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activeTab === 'activity' ? (
              scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                    <Smartphone size={32} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No activity yet</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs">When customers scan your QR code, their engagement will appear here in real-time.</p>
                </div>
              ) : (
                scans.slice(0, 15).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        scan.status === 'Reward Won'
                          ? 'bg-emerald-50 text-emerald-600'
                          : scan.status === 'No Win'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {scan.status === 'Reward Won' ? <Gift size={18} /> : scan.status === 'No Win' ? <AlertCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {scan.customer_name || (scan.customer_phone ? `+91 ${scan.customer_phone}` : 'Walk-in Customer')}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatDate(scan.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        scan.status === 'Reward Won'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : scan.status === 'No Win'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : winnerScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Award size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No winners yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">Keep encouraging customers to scan and play!</p>
              </div>
            ) : (
              winnerScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7BC142]/15 to-[#1857D6]/15 text-[#3E7A1C]">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {scan.customer_name || (scan.customer_phone ? `+91 ${scan.customer_phone}` : 'Walk-in Customer')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Prize: <span className="font-bold text-[#3E7A1C]">{scan.prize_won || 'Reward'}</span></p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{formatDate(scan.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right Column: Lifetime Summary (5/12) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col self-start rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Lifetime Summary</h2>
              <p className="text-xs text-slate-500">All-time engagement statistics for your shop.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1857D6]/5 to-[#7BC142]/5 border border-slate-200 text-center">
              <p className="text-sm font-medium text-slate-500">Total Lifetime Scans</p>
              <h3 className="text-4xl font-bold text-[#0B0F19] mt-2">{totalScans}</h3>
              <p className="text-xs text-slate-400 mt-2">Since you joined the platform</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Customers</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{totalRegisteredCustomers}</h4>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Scans/Customer</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">
                  {totalRegisteredCustomers > 0 ? (totalScans / totalRegisteredCustomers).toFixed(1) : '0.0'}
                </h4>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cards Opened</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{totalOpened}</h4>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Win Rate</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">
                  {totalOpened > 0 ? `${Math.round((totalWinners / totalOpened) * 100)}%` : '0%'}
                </h4>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}