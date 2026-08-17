'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Store,
  Users,
  Truck,
  Package,
  ShoppingCart,
  Ticket,
  CreditCard,
  Loader2,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  Coins,
  Gift,
  ArrowUpRight,
  Share2,
  Activity,
  IndianRupee,
  Trophy,
} from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant {
  id: string
  business_name: string
  status: string
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    pendingMerchants: 0,
    totalCustomers: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalScans: 0,
    totalWinners: 0,
    totalRevenue: 0,
    outstandingAmount: 0,
    totalMerchantBilling: 0,
    pointsIssued: 0,
    pointsRedeemed: 0,
    walletTransactions: 0,
    totalReferrals: 0,
    activeCampaigns: 0,
  })

  const [recentMerchants, setRecentMerchants] = useState<Merchant[]>([])
  const [chartData, setChartData] = useState<{day: string, scans: number}[]>([
    { day: 'Mon', scans: 0 }, { day: 'Tue', scans: 0 }, { day: 'Wed', scans: 0 },
    { day: 'Thu', scans: 0 }, { day: 'Fri', scans: 0 }, { day: 'Sat', scans: 0 }, { day: 'Sun', scans: 0 }
  ])

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true)
      
      try {
        const [merchantsRes, scansRes, paymentsRes, txRes, productsRes, ordersRes, vendorsRes, refRes, campRes] = await Promise.allSettled([
          supabase.from('merchants').select('id, business_name, status, created_at'),
          supabase.from('qr_scans').select('id, customer_phone, status, created_at'),
          supabase.from('merchant_payments').select('amount, status'),
          supabase.from('merchant_transactions').select('amount, transaction_type, wallet_type'),
          supabase.from('products').select('id'),
          supabase.from('orders').select('id'),
          supabase.from('vendors').select('id'),
          supabase.from('merchant_referrals').select('id'),
          supabase.from('campaigns').select('id, status')
        ])

        const merchData = merchantsRes.status === 'fulfilled' ? merchantsRes.value.data : []
        const scanData = scansRes.status === 'fulfilled' ? scansRes.value.data : []
        const payData = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data : []
        const txData = txRes.status === 'fulfilled' ? txRes.value.data : []
        const prodData = productsRes.status === 'fulfilled' ? productsRes.value.data : []
        const orderData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : []
        const vendData = vendorsRes.status === 'fulfilled' ? vendorsRes.value.data : []
        const refData = refRes.status === 'fulfilled' ? refRes.value.data : []
        const campData = campRes.status === 'fulfilled' ? campRes.value.data : []

        const pending = merchData?.filter(m => m.status?.toLowerCase() === 'pending') || []
        const active = merchData?.filter(m => m.status?.toLowerCase() === 'approved' || m.status?.toLowerCase() === 'active') || []
        const approvedPays = payData?.filter(p => p.status === 'approved') || []
        const pendingPays = payData?.filter(p => p.status === 'pending') || []
        const winners = scanData?.filter(s => s.status === 'Reward Won') || []
        const activeCampaigns = campData?.filter(c => c.status === 'active') || []
        
        const uniqueCustomers = new Set()
        scanData?.forEach(s => s.customer_phone && uniqueCustomers.add(s.customer_phone))

        let ptsIssued = 0
        let ptsRedeemed = 0
        let walletTxns = 0
        
        txData?.forEach(tx => {
          if (tx.wallet_type === 'points') {
            if (tx.transaction_type === 'credit') ptsIssued += tx.amount
            else ptsRedeemed += tx.amount
          } else {
            walletTxns++
          }
        })

        const totalBilling = approvedPays.reduce((sum, p) => sum + p.amount, 0) + pendingPays.reduce((sum, p) => sum + p.amount, 0)

        const now = new Date()
        const tempChart: { day: string; dateStr: string; scans: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
          tempChart.push({
            day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
            dateStr: date.toDateString(),
            scans: 0
          })
        }
        scanData?.forEach(scan => {
          const scanDateStr = new Date(scan.created_at).toDateString()
          const chartEntry = tempChart.find(c => c.dateStr === scanDateStr)
          if (chartEntry) chartEntry.scans++
        })

        setRecentMerchants(merchData?.slice(0, 5) || [])
        setChartData(tempChart.map(({day, scans}) => ({day, scans})))

        setStats({
          totalMerchants: merchData?.length || 0,
          activeMerchants: active.length,
          pendingMerchants: pending.length,
          totalCustomers: uniqueCustomers.size,
          totalVendors: vendData?.length || 0,
          totalProducts: prodData?.length || 0,
          totalOrders: orderData?.length || 0,
          totalScans: scanData?.length || 0,
          totalWinners: winners.length,
          totalRevenue: approvedPays.reduce((sum, p) => sum + p.amount, 0),
          outstandingAmount: pendingPays.reduce((sum, p) => sum + p.amount, 0),
          totalMerchantBilling: totalBilling,
          pointsIssued: ptsIssued,
          pointsRedeemed: ptsRedeemed,
          walletTransactions: walletTxns,
          totalReferrals: refData?.length || 0,
          activeCampaigns: activeCampaigns.length || 0,
        })

      } catch (err) {
        console.error(err)
        setError('Failed to load admin dashboard data. Ensure database tables exist.')
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [supabase])

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  const scanPieData = [
    { name: 'Winners', value: stats.totalWinners },
    { name: 'Others', value: Math.max(0, stats.totalScans - stats.totalWinners) }
  ]
  const billingPieData = [
    { name: 'Collected', value: stats.totalRevenue },
    { name: 'Outstanding', value: stats.outstandingAmount }
  ]
  const pointsPieData = [
    { name: 'Issued', value: stats.pointsIssued },
    { name: 'Redeemed', value: stats.pointsRedeemed }
  ]

  const PIE_COLORS = ['#1857D6', '#93C5FD']
  const GREEN_COLORS = ['#3E7A1C', '#86EFAC']
  const ROSE_COLORS = ['#E11D48', '#FDA4AF']

  const QUICK_ACTIONS = [
    { href: '/merchants', label: 'Approve Merchants', icon: Store },
    { href: '/admin-payments', label: 'Verify Payments', icon: CreditCard },
    { href: '/campaigns', label: 'New Campaign', icon: Ticket },
    { href: '/gifts', label: 'Add Gifts', icon: Gift },
    { href: '/products', label: 'Add Products', icon: Package },
    { href: '/admin-reports', label: 'View Reports', icon: TrendingUp },
  ]

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50 px-6 py-5 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0B0F19] to-[#1857D6] text-white shadow-lg shadow-blue-500/20">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Platform Overview</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor platform growth, pending approvals, and financial metrics.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live • Updated just now
        </div>
      </motion.div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Store size={18} />} label="Total Merchants" value={stats.totalMerchants} sub={`${stats.activeMerchants} Active`} accent="blue" />
        <StatCard icon={<Clock size={18} />} label="Pending Approvals" value={stats.pendingMerchants} sub="Awaiting review" accent="amber" />
        <StatCard icon={<Users size={18} />} label="Total Customers" value={stats.totalCustomers} sub="Unique phone numbers" accent="green" />
        <StatCard icon={<IndianRupee size={18} />} label="Total Sales" value={`₹${stats.totalRevenue.toLocaleString()}`} sub="From merchants" accent="blue" />
      </div>

      {/* Beautiful Pie Chart Stat Cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        <ChartStatCard icon={<TrendingUp size={18} />} label="Total QR Scans & Engagements" value={stats.totalScans.toLocaleString()} sub="Scratch cards issued">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={scanPieData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                <Cell fill={PIE_COLORS[0]} />
                <Cell fill={PIE_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} itemStyle={{ color: '#0F172A' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        <ChartStatCard icon={<Trophy size={18} />} label="Total Winners" value={stats.totalWinners} sub="Successful reward claims">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={scanPieData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                <Cell fill={GREEN_COLORS[0]} />
                <Cell fill={GREEN_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} itemStyle={{ color: '#0F172A' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        <ChartStatCard icon={<CreditCard size={18} />} label="Outstanding Payments" value={`₹${stats.outstandingAmount}`} sub="Pending merchant bills">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={billingPieData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                <Cell fill={ROSE_COLORS[0]} />
                <Cell fill={ROSE_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} itemStyle={{ color: '#0F172A' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

        <ChartStatCard icon={<Coins size={18} />} label="Points Issued" value={stats.pointsIssued.toLocaleString()} sub="In circulation">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pointsPieData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                <Cell fill={PIE_COLORS[0]} />
                <Cell fill={PIE_COLORS[1]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} itemStyle={{ color: '#0F172A' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartStatCard>

      </div>

      {/* Charts & Activity Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#1857D6]" />
              <h2 className="text-base font-semibold text-slate-900">Platform Scan Activity</h2>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Last 7 Days
            </span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdminScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1857D6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1857D6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#0B0F19' }}
                />
                <Area type="monotone" dataKey="scans" stroke="#1857D6" strokeWidth={3} fill="url(#colorAdminScans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-[#1857D6]" />
              <h2 className="text-base font-semibold text-slate-900">Recent Merchants</h2>
            </div>
          </div>
          <ul className="space-y-4">
            {recentMerchants.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No merchants registered yet.</p>
            ) : (
              recentMerchants.map((m) => (
                <li key={m.id} className="flex items-start gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.status === 'approved' || m.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-slate-700 font-medium">{m.business_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{m.status} • {new Date(m.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </div>

      {/* Quick Actions & Ecom Stats */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Quick Actions */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Admin Quick Actions</h2>
              <p className="text-xs text-slate-500">Jump straight to management tools.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        {/* E-Commerce & Campaign Summary — now a compact 2-col grid */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">E-Commerce & Growth</h2>
              <p className="text-xs text-slate-500">Platform inventory and campaign metrics.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat icon={<IndianRupee size={14} />} label="Billing" value={`₹${stats.totalMerchantBilling.toLocaleString()}`} />
            <MiniStat icon={<Truck size={14} />} label="Vendors" value={stats.totalVendors} />
            <MiniStat icon={<Package size={14} />} label="Products" value={stats.totalProducts} />
            <MiniStat icon={<ShoppingCart size={14} />} label="Orders" value={stats.totalOrders} />
            <MiniStat icon={<Share2 size={14} />} label="Referrals" value={stats.totalReferrals} />
            <MiniStat icon={<Coins size={14} />} label="Redeemed" value={stats.pointsRedeemed.toLocaleString()} />
            <MiniStat icon={<Wallet size={14} />} label="Wallet Txns" value={stats.walletTransactions} />
            <MiniStat icon={<Ticket size={14} />} label="Campaigns" value={stats.activeCampaigns} />
          </div>
        </div>

      </div>
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
  accent: 'blue' | 'green' | 'amber'
}) {
  const accentClass = 
    accent === 'blue' ? 'from-[#1857D6]/10 to-[#1857D6]/0 text-[#1857D6]' 
    : accent === 'green' ? 'from-[#7BC142]/10 to-[#7BC142]/0 text-[#3E7A1C]'
    : 'from-amber-500/10 to-amber-500/0 text-amber-600'

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
      <div className="h-[100px] w-full mt-auto flex items-center justify-center">
        {children}
      </div>
    </motion.div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50/50 border border-slate-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[11px] font-medium text-slate-500 leading-none">{label}</span>
      </div>
      <span className="font-bold text-slate-900 text-sm leading-none">{value}</span>
    </div>
  )
}