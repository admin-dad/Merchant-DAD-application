'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Building2 as BuildingIcon,
  Users as UsersIcon,
  Receipt as ReceiptIcon,
  Wallet as WalletIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Lock as LockIcon,
  ChevronRight as ChevronRightIcon,
  LayoutGrid as LayoutGridIcon,
  ListTree as ListTreeIcon,
  CalendarDays as CalendarDaysIcon,
  TrendingUp as TrendingUpIcon,
  Tag as TagIcon,
  Gift as GiftIcon,
  CreditCard as CardIcon,
  SlidersHorizontal as SlidersIcon,
  X as XIcon,
  LayoutList as LayoutListIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type BillingType = 'per_scan' | 'monthly'
type TabKey = 'individual' | 'all'
type FilterMode = 'all' | 'today' | '7days' | 'custom'
type TxKind = 'billing' | 'points'
type KindFilter = 'all' | TxKind

interface MerchantRow {
  id: string
  business_name: string
  category: string | null
  sub_category: string | null
  billing_type: BillingType | null
}

interface RawMerchantsJoin {
  business_name: string
}

interface PaymentRow {
  id: string
  merchant_id: string
  amount: number
  status: string
  created_at: string
  merchants?: RawMerchantsJoin | RawMerchantsJoin[] | null
}

interface PointsPurchaseRow {
  id: string
  merchant_id: string
  amount: number
  description: string | null
  created_at: string
  merchants?: RawMerchantsJoin | RawMerchantsJoin[] | null
}

// Unified shape both billing payments and points purchases get flattened into,
// so the same tabs/filters/table can render either kind side by side.
interface AdminTransaction {
  id: string
  merchant_id: string
  merchant_name: string
  kind: TxKind
  amount: number // ₹ for billing, points count for points
  approxMoney?: number // points kind only — points × current rate, approximate
  status: string // billing: approved/pending/failed/etc. points: always 'completed'
  detail: string // display label — payment id for billing, description for points
  created_at: string
}

const formatMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

function normalizeMerchantName(m: RawMerchantsJoin | RawMerchantsJoin[] | null | undefined): string {
  if (!m) return 'Unknown Merchant'
  if (Array.isArray(m)) return m[0]?.business_name || 'Unknown Merchant'
  return m.business_name || 'Unknown Merchant'
}

function statusBadgeClasses(status: string) {
  if (status === 'approved' || status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'pending' || status === 'created') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'failed' || status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function kindBadgeClasses(kind: TxKind) {
  return kind === 'points'
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-blue-50 text-[#1857D6] border-blue-200'
}

// Inclusive date-range test used by every filter mode.
function isWithinFilter(isoDate: string, mode: FilterMode, customStart: string, customEnd: string) {
  const d = new Date(isoDate)
  const now = new Date()

  if (mode === 'all') return true

  if (mode === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return d >= startOfDay
  }

  if (mode === '7days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= sevenDaysAgo
  }

  if (mode === 'custom') {
    if (!customStart && !customEnd) return true
    const s = customStart ? new Date(`${customStart}T00:00:00`) : null
    const e = customEnd ? new Date(`${customEnd}T23:59:59`) : null
    if (s && d < s) return false
    if (e && d > e) return false
    return true
  }

  return true
}

const DATE_FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7days', label: 'Last 7 days' },
  { key: 'custom', label: 'Custom' },
]

const KIND_FILTERS: { key: KindFilter; label: string; icon: typeof CardIcon | null }[] = [
  { key: 'all', label: 'All types', icon: LayoutListIcon },
  { key: 'billing', label: 'Billing payments', icon: CardIcon },
  { key: 'points', label: 'Points purchases', icon: GiftIcon },
]

export default function AdminMerchantBillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [merchants, setMerchants] = useState<MerchantRow[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])

  const [activeTab, setActiveTab] = useState<TabKey>('individual')
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [merchantSearch, setMerchantSearch] = useState('')
  const [txSearch, setTxSearch] = useState('')

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')

  // ── Fetch everything ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      setIsAuthenticated(true)

      // NOTE: the API route below only checks that the user is logged in.
      // Add your own admin-role check inside that route (see its TODO comment)
      // before shipping this to production.

      // Fetched via /api/admin/merchant-billing, which uses the Supabase
      // SERVICE ROLE key server-side. This is deliberate: each merchant's own
      // RLS policy only lets them see their OWN payments/transactions, so
      // querying merchant_payments or merchant_transactions directly from
      // this client would silently return zero rows for every merchant here.
      // The API route bypasses RLS after verifying the caller is authenticated.
      const res = await fetch('/api/admin/merchant-billing', { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load billing data (status ${res.status})`)
      }

      setMerchants((json.merchants as MerchantRow[]) || [])

      const valuePerPoint: number = json.valuePerPoint ?? 1

      const billingTx: AdminTransaction[] = ((json.payments as PaymentRow[]) || []).map((p) => ({
        id: p.id,
        merchant_id: p.merchant_id,
        merchant_name: normalizeMerchantName(p.merchants),
        kind: 'billing',
        amount: p.amount,
        status: p.status,
        detail: `#${p.id.slice(0, 8).toUpperCase()}`,
        created_at: p.created_at,
      }))

      // Points purchases are always fully paid by the time they're logged
      // (the wallet page only inserts this row after Razorpay verification
      // succeeds), so they're shown as 'completed' — there's no in-between
      // status stored for them like there is for merchant_payments.
      const pointsTx: AdminTransaction[] = ((json.pointsPurchases as PointsPurchaseRow[]) || []).map((p) => ({
        id: p.id,
        merchant_id: p.merchant_id,
        merchant_name: normalizeMerchantName(p.merchants),
        kind: 'points',
        amount: p.amount,
        approxMoney: p.amount * valuePerPoint,
        status: 'completed',
        detail: p.description || `${p.amount} points purchased`,
        created_at: p.created_at,
      }))

      const merged = [...billingTx, ...pointsTx].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setTransactions(merged)
    } catch (err: unknown) {
      console.error('Admin merchant billing fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load billing data.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Derived: per-merchant summaries ─────────────────────────────────
  const merchantSummaries = useMemo(() => {
    return merchants.map((m) => {
      const merchantTx = transactions.filter((t) => t.merchant_id === m.id)
      const revenue = merchantTx.reduce((sum, t) => {
        if (t.kind === 'billing') {
          return t.status === 'approved' || t.status === 'completed' ? sum + t.amount : sum
        }
        // points purchases are always completed by the time they're logged
        return sum + (t.approxMoney ?? 0)
      }, 0)
      return {
        merchant: m,
        count: merchantTx.length,
        revenue,
        lastAt: merchantTx[0]?.created_at || null, // transactions is pre-sorted latest-first
      }
    })
  }, [merchants, transactions])

  const filteredMerchantSummaries = useMemo(() => {
    const term = merchantSearch.trim().toLowerCase()
    if (!term) return merchantSummaries
    return merchantSummaries.filter(
      (s) =>
        s.merchant.business_name.toLowerCase().includes(term) ||
        (s.merchant.sub_category || '').toLowerCase().includes(term) ||
        (s.merchant.category || '').toLowerCase().includes(term)
    )
  }, [merchantSummaries, merchantSearch])

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId) || null

  const applyFilters = useCallback(
    (list: AdminTransaction[]) =>
      list
        .filter((t) => kindFilter === 'all' || t.kind === kindFilter)
        .filter((t) => isWithinFilter(t.created_at, filterMode, customStart, customEnd)),
    [kindFilter, filterMode, customStart, customEnd]
  )

  const selectedMerchantTransactions = useMemo(() => {
    if (!selectedMerchantId) return []
    return applyFilters(transactions.filter((t) => t.merchant_id === selectedMerchantId))
  }, [transactions, selectedMerchantId, applyFilters])

  // ── Derived: combined "all together" feed ───────────────────────────
  const allTransactionsFiltered = useMemo(() => {
    const term = txSearch.trim().toLowerCase()
    return applyFilters(transactions).filter(
      (t) =>
        !term ||
        t.merchant_name.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        t.detail.toLowerCase().includes(term)
    )
  }, [transactions, applyFilters, txSearch])

  const globalStats = useMemo(() => {
    const billingRevenue = transactions
      .filter((t) => t.kind === 'billing' && (t.status === 'approved' || t.status === 'completed'))
      .reduce((sum, t) => sum + t.amount, 0)
    const pointsSold = transactions.filter((t) => t.kind === 'points').reduce((sum, t) => sum + t.amount, 0)
    const pointsApproxRevenue = transactions
      .filter((t) => t.kind === 'points')
      .reduce((sum, t) => sum + (t.approxMoney ?? 0), 0)
    return {
      totalMerchants: merchants.length,
      totalTransactions: transactions.length,
      billingRevenue,
      pointsSold,
      pointsApproxRevenue,
    }
  }, [merchants, transactions])

  // ── Filter bar state helpers ────────────────────────────────────────
  const hasActiveFilters = filterMode !== 'all' || kindFilter !== 'all'

  const resetFilters = useCallback(() => {
    setFilterMode('all')
    setCustomStart('')
    setCustomEnd('')
    setKindFilter('all')
  }, [])

  // ── Auth gate ────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <LockIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Login Required</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Please log in to an authorized account to view merchant billing records.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1857D6] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white min-h-screen">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-blue-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <WalletIcon size={30} />
            </div>
            <div>
              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6] mb-1">
                Admin
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Billing
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Scan/subscription payments and reward-points purchases, together in one place.
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon size={16} className={loading ? 'animate-spin text-[#1857D6]' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertIcon size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Merchants</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <BuildingIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{globalStats.totalMerchants}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Transactions</span>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <ReceiptIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{globalStats.totalTransactions}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUpIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">₹{formatMoney(globalStats.billingRevenue)}</h3>
          <p className="text-xs text-slate-400 mt-1">Scan &amp; subscription payments</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Points Sold</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <GiftIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-600">{globalStats.pointsSold.toLocaleString()} pts</h3>
          <p className="text-xs text-slate-400 mt-1">≈ ₹{formatMoney(globalStats.pointsApproxRevenue)} at current rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-1">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'individual'
              ? 'bg-white text-[#1857D6] shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListTreeIcon size={16} />
          Individual Merchants
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-[#1857D6] shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutGridIcon size={16} />
          All Transactions Together
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Filter bar — shared by both tabs                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {/* Bar header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <SlidersIcon size={14} />
            </div>
            <span className="text-sm font-bold text-slate-800">Filters</span>
          </div>

          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              >
                <XIcon size={12} />
                Reset
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 lg:flex-row lg:divide-y-0 lg:divide-x">
          {/* Date range group */}
          <div className="flex-1 px-5 py-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <CalendarDaysIcon size={12} />
              Date range
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  aria-pressed={filterMode === f.key}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    filterMode === f.key
                      ? 'bg-[#1857D6] text-white shadow-sm shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <AnimatePresence initial={false}>
              {filterMode === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    />
                    <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transaction type group */}
          <div className="flex-1 px-5 py-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <ReceiptIcon size={12} />
              Transaction type
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {KIND_FILTERS.map((f) => {
                const isActive = kindFilter === f.key
                const activeClasses =
                  f.key === 'points'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : f.key === 'billing'
                    ? 'bg-[#1857D6] text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-800 text-white shadow-sm shadow-slate-500/20'
                return (
                  <button
                    key={f.key}
                    onClick={() => setKindFilter(f.key)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isActive ? activeClasses : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.icon && <f.icon size={12} />}
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
        </div>
      ) : activeTab === 'individual' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Merchant list */}
          <div className="lg:col-span-4 flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search merchants..."
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {filteredMerchantSummaries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <UsersIcon size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No merchants found</p>
                </div>
              ) : (
                filteredMerchantSummaries.map(({ merchant, count, revenue, lastAt }) => {
                  const isSelected = merchant.id === selectedMerchantId
                  return (
                    <button
                      key={merchant.id}
                      onClick={() => setSelectedMerchantId(merchant.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-all cursor-pointer ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#1857D6]' : 'text-slate-900'}`}>
                            {merchant.business_name}
                          </p>
                          {merchant.billing_type === 'monthly' && (
                            <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                              Monthly
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {merchant.sub_category && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                              <TagIcon size={10} />
                              {merchant.sub_category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {count} transaction{count === 1 ? '' : 's'} · ≈ ₹{formatMoney(revenue)} revenue
                          {lastAt ? ` · last ${formatDate(lastAt)}` : ''}
                        </p>
                      </div>
                      <ChevronRightIcon
                        size={16}
                        className={`shrink-0 ${isSelected ? 'text-[#1857D6]' : 'text-slate-300'}`}
                      />
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Selected merchant transactions */}
          <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {!selectedMerchant ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <BuildingIcon size={32} />
                </div>
                <p className="text-base font-semibold text-slate-800">Select a merchant</p>
                <p className="mt-1 text-sm text-slate-500 max-w-xs">
                  Pick a merchant on the left to see their billing payments and points purchases together.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{selectedMerchant.business_name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedMerchantTransactions.length} transaction
                      {selectedMerchantTransactions.length === 1 ? '' : 's'} in this filter
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                      selectedMerchant.billing_type === 'monthly'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedMerchant.billing_type === 'monthly' ? 'Monthly Plan' : 'Per-Scan Billing'}
                  </span>
                </div>

                {selectedMerchantTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ReceiptIcon size={28} className="text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-800">No transactions in this range</p>
                    <p className="mt-1 text-xs text-slate-500">Try a different date or type filter above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-6">Type</th>
                          <th className="py-3.5 px-6">Details &amp; Date</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {selectedMerchantTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80">
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${kindBadgeClasses(
                                  tx.kind
                                )}`}
                              >
                                {tx.kind === 'points' ? <GiftIcon size={11} /> : <CardIcon size={11} />}
                                {tx.kind === 'points' ? 'Points Purchase' : 'Billing Payment'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-mono font-bold text-slate-900 truncate max-w-xs">{tx.detail}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClasses(
                                  tx.status
                                )}`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {tx.kind === 'points' ? (
                                <>
                                  <p className="font-mono font-bold text-purple-700">{tx.amount.toLocaleString()} pts</p>
                                  <p className="text-[11px] text-slate-400">≈ ₹{formatMoney(tx.approxMoney ?? 0)}</p>
                                </>
                              ) : (
                                <p className="font-mono font-bold text-slate-900">₹{formatMoney(tx.amount)}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* All-together search */}
          <div className="mb-6 relative">
            <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant name, payment ID, or description..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">All Merchant Transactions — Latest First</h2>
              <p className="text-xs text-slate-500 mt-0.5">{allTransactionsFiltered.length} transactions in this filter</p>
            </div>

            {allTransactionsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <ReceiptIcon size={32} />
                </div>
                <p className="text-base font-semibold text-slate-800">No transactions found</p>
                <p className="mt-1 text-xs text-slate-500">Try a different filter or search term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">Merchant</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Details &amp; Date</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {allTransactionsFiltered.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-6">
                          <button
                            onClick={() => {
                              setSelectedMerchantId(tx.merchant_id)
                              setActiveTab('individual')
                            }}
                            className="font-bold text-slate-900 hover:text-[#1857D6] transition-colors cursor-pointer text-left"
                          >
                            {tx.merchant_name}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${kindBadgeClasses(
                              tx.kind
                            )}`}
                          >
                            {tx.kind === 'points' ? <GiftIcon size={11} /> : <CardIcon size={11} />}
                            {tx.kind === 'points' ? 'Points' : 'Billing'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-mono font-bold text-slate-900 truncate max-w-xs">{tx.detail}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClasses(
                              tx.status
                            )}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {tx.kind === 'points' ? (
                            <>
                              <p className="font-mono font-bold text-purple-700">{tx.amount.toLocaleString()} pts</p>
                              <p className="text-[11px] text-slate-400">≈ ₹{formatMoney(tx.approxMoney ?? 0)}</p>
                            </>
                          ) : (
                            <p className="font-mono font-bold text-slate-900">₹{formatMoney(tx.amount)}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}