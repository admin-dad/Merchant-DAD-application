'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import MerchantScratchCard from '@/components/MerchantScratchCard'
import {
  Gift,
  Users,
  QrCode,
  Trophy,
  Clock,
  Receipt,
  TrendingUp,
  Bell,
  Activity,
  Download,
  Share2,
  UserPlus,
  CreditCard,
  ShoppingBag,
  Award,
  LifeBuoy,
  FileBarChart2,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Store,
} from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis } from 'recharts'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
  billing_rate: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)

  // Stats State
  const [points, setPoints] = useState(0)
  const [b2bRewards, setB2bRewards] = useState(0) // Replaced cash/wallet with B2B Points tracking
  const [totalReferrals, setTotalReferrals] = useState(0)
  const [successfulReferrals, setSuccessfulReferrals] = useState(0)
  const [todayScans, setTodayScans] = useState(0)
  const [monthlyScans, setMonthlyScans] = useState(0)
  const [totalScans, setTotalScans] = useState(0)
  const [winningCustomers, setWinningCustomers] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [outstandingAmount, setOutstandingAmount] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  
  const [chartData, setChartData] = useState<{day: string, scans: number}[]>([
    { day: 'Mon', scans: 0 }, { day: 'Tue', scans: 0 }, { day: 'Wed', scans: 0 },
    { day: 'Thu', scans: 0 }, { day: 'Fri', scans: 0 }, { day: 'Sat', scans: 0 }, { day: 'Sun', scans: 0 }
  ])
  const [activities, setActivities] = useState<{id: string, text: string, time: string}[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // 1. Fetch Merchant
      const { data: merchData, error: merchError } = await supabase
        .from('merchants')
        .select('id, business_name, billing_rate')
        .eq('user_id', user.id)
        .single()

      if (merchError || !merchData) {
        setError('Could not load merchant profile.')
        setLoading(false)
        return
      }
      setMerchant(merchData)

      // 2. Fetch Scans
      const { data: scansData } = await supabase
        .from('qr_scans')
        .select('id, customer_phone, status, created_at')
        .eq('merchant_id', merchData.id)
        .order('created_at', { ascending: false })

      if (scansData) {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const uniquePhones = new Set()
        let wins = 0
        let todayCount = 0
        let monthCount = 0

        // Format chart data (Last 7 days)
        const tempChart: { day: string; dateStr: string; scans: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
          tempChart.push({
            day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
            dateStr: date.toDateString(),
            scans: 0
          })
        }

        scansData.forEach(scan => {
          const scanDate = new Date(scan.created_at)
          if (scanDate >= startOfToday) todayCount++
          if (scanDate >= startOfMonth) monthCount++
          if (scan.status === 'Reward Won') wins++
          if (scan.customer_phone) uniquePhones.add(scan.customer_phone)

          // Match for chart
          const scanDateStr = scanDate.toDateString()
          const chartEntry = tempChart.find(c => c.dateStr === scanDateStr)
          if (chartEntry) chartEntry.scans++
        })

        // Format activities (Latest 4 scans)
        const tempActivities = scansData.slice(0, 4).map(scan => {
          const diffMs = now.getTime() - new Date(scan.created_at).getTime()
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
          const time = diffHrs < 1 ? `${Math.floor(diffMs / (1000 * 60))} min ago` : `${diffHrs}h ago`
          return {
            id: scan.id,
            text: `QR scanned by ${scan.customer_phone ? `+91 ${scan.customer_phone}` : 'a customer'}`,
            time: time
          }
        })

        setTodayScans(todayCount)
        setMonthlyScans(monthCount)
        setTotalScans(scansData.length)
        setWinningCustomers(wins)
        setTotalCustomers(uniquePhones.size)
        setChartData(tempChart.map(({day, scans}) => ({day, scans})))
        setActivities(tempActivities)
      }

      // 3. Fetch Ledger (Points & Rewards Only)
      const { data: txData } = await supabase
        .from('merchant_transactions')
        .select('amount, transaction_type, wallet_type, category, description')
        .eq('merchant_id', merchData.id)

      if (txData) {
        let pts = 0
        let b2bWon = 0
        
        txData.forEach(tx => {
          if (tx.wallet_type === 'points') {
            // Calculate total points balance
            pts += tx.transaction_type === 'credit' ? tx.amount : -tx.amount
            
            // Calculate points specifically won from Admin B2B Scratch Cards
            if (tx.transaction_type === 'credit' && (tx.category === 'reward' || tx.description?.toLowerCase().includes('scratch card'))) {
              b2bWon += tx.amount
            }
          }
        })
        
        setPoints(pts)
        setB2bRewards(b2bWon)
      }

      // 4. Fetch Referrals
      const { data: refData } = await supabase
        .from('merchant_referrals')
        .select('status')
        .eq('referrer_id', merchData.id)

      if (refData) {
        setTotalReferrals(refData.length)
        setSuccessfulReferrals(refData.filter(r => r.status === 'approved').length)
      }

      // 5. Fetch Payments & Calculate Billing (in Points)
      const { data: payData } = await supabase
        .from('merchant_payments')
        .select('amount, status')
        .eq('merchant_id', merchData.id)

      if (payData) {
        const paid = payData.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)
        const totalBill = (scansData?.length || 0) * merchData.billing_rate
        setTotalPaid(paid)
        setOutstandingAmount(Math.max(0, totalBill - paid))
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [router, supabase])

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────────────
  if (error || !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load dashboard data.'}</p>
      </div>
    )
  }

  const QUICK_ACTIONS = [
    { href: '/profile', label: 'Update Profile', icon: UserPlus },
    { href: '/qr-code', label: 'Download QR', icon: Download },
    { href: '/referral', label: 'Share Referral', icon: Share2 },
    { href: '/billing', label: 'View Billing', icon: Receipt },
    { href: '/payment', label: 'Make Payment', icon: CreditCard },
    { href: '/wallet', label: 'Redeem Points', icon: Gift },
    { href: '/shop', label: 'E-Commerce', icon: ShoppingBag },
    { href: '/benefits', label: 'Benefits', icon: Award },
    { href: '/reports', label: 'Reports', icon: FileBarChart2 },
    { href: '/support', label: 'Support', icon: LifeBuoy },
  ]

  // Chart Data Parsers
  const scanPieData = [
    { name: 'Today', value: todayScans },
    { name: 'Rest of Month', value: Math.max(0, monthlyScans - todayScans) }
  ]
  const winPieData = [
    { name: 'Won', value: winningCustomers },
    { name: 'Others', value: Math.max(0, totalScans - winningCustomers) }
  ]
  const paidPieData = [
    { name: 'Paid', value: totalPaid },
    { name: 'Outstanding', value: outstandingAmount }
  ]
  const outPieData = [
    { name: 'Outstanding', value: outstandingAmount },
    { name: 'Paid', value: totalPaid }
  ]

  const PIE_COLORS = ['#1857D6', '#E2E8F0']
  const GREEN_COLORS = ['#3E7A1C', '#E2E8F0']
  const ROSE_COLORS = ['#E11D48', '#E2E8F0']

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Page Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Store size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back, {merchant.business_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Here&apos;s what&apos;s happening at your shop today. Monitor analytics, scans, and rewards.
              </p>
            </div>
          </div>
          <Link
            href="/qr-code"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] cursor-pointer"
          >
            <QrCode size={18} />
            <span>View Shop QR</span>
          </Link>
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Gift size={18} />}
          label="Available Points"
          value={points.toLocaleString()}
          sub="+200 joining bonus"
          accent="blue"
        />
        {/* Replaced Wallet Cash Balance with B2B Scratch Card Wins */}
        <StatCard
          icon={<Trophy size={18} />}
          label="B2B Points Won"
          value={b2bRewards.toLocaleString()}
          sub="From scratch cards"
          accent="green"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Total Referrals"
          value={totalReferrals}
          sub={`${successfulReferrals} successful`}
          accent="blue"
        />
        <StatCard
          icon={<QrCode size={18} />}
          label="Today's QR Scans"
          value={todayScans}
          sub={`${monthlyScans} this month`}
          accent="green"
        />
      </div>

      {/* Beautiful Pie Chart Stat Cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Scans - Pie Chart */}
        <ChartStatCard icon={<TrendingUp size={18} />} label="Total Scans" value={totalScans.toLocaleString()} sub="All-time engagements">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={scanPieData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={45} paddingAngle={3}>
                <Cell fill={PIE_COLORS[0]} />
                <Cell fill={PIE_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        {/* Winning Customers - Pie Chart */}
        <ChartStatCard icon={<Trophy size={18} />} label="Winning Customers" value={winningCustomers} sub="Reward claims">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={winPieData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={45} paddingAngle={3}>
                <Cell fill={GREEN_COLORS[0]} />
                <Cell fill={GREEN_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        {/* Total Paid - Pie Chart (Now in Points) */}
        <ChartStatCard icon={<CreditCard size={18} />} label="Total Paid" value={`${totalPaid.toLocaleString()} Pts`} sub="Lifetime payments">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={paidPieData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={45} paddingAngle={3}>
                <Cell fill={GREEN_COLORS[0]} />
                <Cell fill={GREEN_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        {/* Outstanding - Pie Chart (Now in Points) */}
        <ChartStatCard icon={<Clock size={18} />} label="Outstanding" value={`${outstandingAmount} Pts`} sub="Due now">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outPieData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={45} paddingAngle={3}>
                <Cell fill={ROSE_COLORS[0]} />
                <Cell fill={ROSE_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

      </div>

      {/* Charts & Activity Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* 7-Day Scan Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#1857D6]" />
              <h2 className="text-base font-semibold text-slate-900">7-Day Scan Activity</h2>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Weekly Engagement
            </span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1857D6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1857D6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#0B0F19' }}
                />
                <Area type="monotone" dataKey="scans" stroke="#1857D6" strokeWidth={3} fill="url(#colorScans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#1857D6]" />
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            </div>
          </div>
          <ul className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No recent activity yet.</p>
            ) : (
              activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7BC142]" />
                  <div>
                    <p className="text-slate-700 font-medium">{a.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-500">Jump straight to your tools.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-4 text-center transition-all hover:border-[#1857D6]/30 hover:bg-[#1857D6]/5 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1857D6] shadow-sm transition-transform group-hover:scale-110">
                  <Icon size={18} />
                </span>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-[#0B0F19]">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Render B2B Scratch Card if exists */}
      {merchant && <MerchantScratchCard merchantId={merchant.id} />}
      
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  accent: 'blue' | 'green'
}) {
  const accentClass =
    accent === 'blue' ? 'from-[#1857D6]/10 to-[#1857D6]/0 text-[#1857D6]' : 'from-[#7BC142]/10 to-[#7BC142]/0 text-[#3E7A1C]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
    >
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </motion.div>
  )
}

function ChartStatCard({ 
  icon, label, value, sub, children 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  children: React.ReactNode 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
          <span className="text-[#1857D6]">{icon}</span>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mb-3">{sub}</p>
      <div className="h-[90px] w-full mt-auto flex items-center justify-center">
        {children}
      </div>
    </motion.div>
  )
}