'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet as WalletIcon,
  Receipt as ReceiptIcon,
  Users as UsersIcon,
  Percent as PercentIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  QrCode as QrIcon,
  ArrowUpRight as ArrowUpRightIcon,
  X as XIcon,
  ChevronDown as ChevronDownIcon,
  Calendar as CalendarIcon,
  ArrowUpDown as ArrowUpDownIcon,
} from 'lucide-react'

interface Merchant {
  id: string
  business_name: string
  category: string | null
  sub_category: string | null
  billing_type: 'per_scan' | 'monthly' | null
  billing_rate: number | null
  status: string
  resolved_scan_amount: number | null   // NEW — matches merchant portal
  rate_source: 'sub_category' | 'billing_rate' | 'default' | 'monthly_flat_fee'  // NEW
}

interface Transaction {
  id: string
  merchant_id: string
  amount: number
  base_amount: number | null
  gst_amount: number | null
  status: string
  payment_method: string | null
  utr_number: string | null
  payment_mode: string | null
  billing_month: string | null
  remarks: string | null
  created_at: string
}

interface ScanRow {
  id: string
  merchant_id: string
  is_paid: boolean | null
  payment_status: string | null
  created_at: string
}

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'
type SortOption = 'latest' | 'oldest' | 'amount_high' | 'amount_low'
type StatusFilter = 'ALL' | 'completed' | 'approved' | 'pending' | 'failed'

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

const statusStyles: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const isSuccessStatus = (status: string) => status === 'completed' || status === 'approved'

export default function AdminBillingPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [scans, setScans] = useState<ScanRow[]>([])

  // Section 2 filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('latest')
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/billing')
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load billing data')
      }

      setMerchants(data.merchants || [])
      setTransactions(data.transactions || [])
      setScans(data.scans || [])
    } catch (err: unknown) {
      console.error('Admin billing fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load billing data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const merchantById = useMemo(() => {
    const map = new Map<string, Merchant>()
    merchants.forEach((m) => map.set(m.id, m))
    return map
  }, [merchants])

  // ── Global summary (top cards) ───────────────────────────────────────
  const successfulTransactions = useMemo(
    () => transactions.filter((t) => isSuccessStatus(t.status)),
    [transactions]
  )

  const totalRevenue = successfulTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalGstCollected = successfulTransactions.reduce((sum, t) => sum + Number(t.gst_amount || 0), 0)
  const totalTransactionsCount = transactions.length
  const billedMerchantIds = new Set(transactions.map((t) => t.merchant_id))

  // ── Section 1: merchant-wise summary ─────────────────────────────────
  const merchantSummaries = useMemo(() => {
    return merchants.map((merchant) => {
      const merchantTxns = transactions.filter((t) => t.merchant_id === merchant.id)
      const merchantSuccessTxns = merchantTxns.filter((t) => isSuccessStatus(t.status))
      const merchantScans = scans.filter((s) => s.merchant_id === merchant.id)
      const paidScans = merchantScans.filter((s) => s.is_paid === true || s.payment_status === 'paid')

      const totalCollected = merchantSuccessTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const gstCollected = merchantSuccessTxns.reduce((sum, t) => sum + Number(t.gst_amount || 0), 0)

      const lastTxn = merchantTxns[0] // transactions already sorted latest-first from the API
      // inside merchantSummaries useMemo, replace the old scanAmount line:
      const scanAmount =
        merchant.billing_type === 'monthly'
          ? merchant.billing_rate && Number(merchant.billing_rate) > 0
            ? Number(merchant.billing_rate)
            : 0
          : merchant.resolved_scan_amount ?? 0

      return {
        merchant,
        scanAmount,
        totalScans: merchantScans.length,
        paidScans: paidScans.length,
        totalTxns: merchantTxns.length,
        totalCollected,
        gstCollected,
        lastTxnDate: lastTxn ? lastTxn.created_at : null,
      }
    })
      // Merchants with at least one transaction float to the top, most recent first.
      .sort((a, b) => {
        if (!a.lastTxnDate && !b.lastTxnDate) return 0
        if (!a.lastTxnDate) return 1
        if (!b.lastTxnDate) return -1
        return new Date(b.lastTxnDate).getTime() - new Date(a.lastTxnDate).getTime()
      })
  }, [merchants, transactions, scans])

  // ── Section 2: filtered / sorted transaction ledger ──────────────────
  const dateBounds = useMemo(() => {
    const now = new Date()
    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start, to: null as Date | null }
    }
    if (datePreset === '7d') {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { from: start, to: null }
    }
    if (datePreset === '30d') {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return { from: start, to: null }
    }
    if (datePreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start, to: null }
    }
    if (datePreset === 'custom') {
      const from = customFrom ? new Date(customFrom) : null
      const to = customTo ? new Date(customTo + 'T23:59:59') : null
      return { from, to }
    }
    return { from: null, to: null }
  }, [datePreset, customFrom, customTo])

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((t) => {
      const merchant = merchantById.get(t.merchant_id)
      const merchantName = merchant?.business_name?.toLowerCase() || ''
      const search = searchTerm.trim().toLowerCase()

      const matchesSearch =
        !search ||
        merchantName.includes(search) ||
        (t.utr_number || '').toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)

      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter

      const matchesMerchant = !selectedMerchantId || t.merchant_id === selectedMerchantId

      const txnDate = new Date(t.created_at)
      const matchesDate =
        (!dateBounds.from || txnDate >= dateBounds.from) && (!dateBounds.to || txnDate <= dateBounds.to)

      return matchesSearch && matchesStatus && matchesMerchant && matchesDate
    })

    result = [...result].sort((a, b) => {
      if (sortOption === 'latest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortOption === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortOption === 'amount_high') return Number(b.amount) - Number(a.amount)
      if (sortOption === 'amount_low') return Number(a.amount) - Number(b.amount)
      return 0
    })

    return result
  }, [transactions, merchantById, searchTerm, statusFilter, selectedMerchantId, dateBounds, sortOption])

  const filteredTotal = filteredTransactions
    .filter((t) => isSuccessStatus(t.status))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const selectedMerchant = selectedMerchantId ? merchantById.get(selectedMerchantId) : null

  const scrollToLedger = () => {
    document.getElementById('all-transactions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderIcon size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8 min-h-screen">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-blue-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <WalletIcon size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Admin Billing</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Merchant-wise collections and the full transaction ledger, across every merchant.
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon size={16} className={refreshing ? 'animate-spin text-[#1857D6]' : ''} />
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

      {/* Global Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <ReceiptIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{formatMoney(totalRevenue)}</h3>
          <p className="text-xs text-slate-400 mt-1">All completed / approved payments</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">GST Collected</span>
            <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
              <PercentIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{formatMoney(totalGstCollected)}</h3>
          <p className="text-xs text-slate-400 mt-1">18% GST portion of revenue</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <ArrowUpRightIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalTransactionsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">All statuses, all time</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Merchants Billed</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <UsersIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {billedMerchantIds.size} <span className="text-xs font-normal text-slate-400">/ {merchants.length} total</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Merchants with at least 1 payment</p>
        </div>
      </div>

      {/* ── SECTION 1: Merchant-wise Transactions ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UsersIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Individual Merchant Transactions</h2>
              <p className="text-xs text-slate-500">Per-merchant scan amount, collections, and last payment.</p>
            </div>
          </div>
          {selectedMerchant && (
            <button
              onClick={() => setSelectedMerchantId(null)}
              className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1857D6] hover:bg-blue-100 cursor-pointer"
            >
              <span>Viewing: {selectedMerchant.business_name}</span>
              <XIcon size={12} />
            </button>
          )}
        </div>

        {merchantSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
              <UsersIcon size={32} />
            </div>
            <p className="text-base font-semibold text-slate-800">No merchants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Merchant</th>
                  <th className="py-4 px-6">Billing</th>
                  <th className="py-4 px-6 text-right">Scan Amount</th>
                  <th className="py-4 px-6 text-right">Scans (Paid / Total)</th>
                  <th className="py-4 px-6 text-right">Total Collected</th>
                  <th className="py-4 px-6 text-right">GST Collected</th>
                  <th className="py-4 px-6">Last Payment</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {merchantSummaries.map(
                  ({ merchant, scanAmount, totalScans, paidScans, totalCollected, gstCollected, lastTxnDate, totalTxns }) => (
                    <tr
                      key={merchant.id}
                      className={selectedMerchantId === merchant.id ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{merchant.business_name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {merchant.sub_category || merchant.category || 'Uncategorized'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold ${merchant.billing_type === 'monthly'
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {merchant.billing_type === 'monthly' ? 'Monthly' : 'Per-Scan'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-900">
                        ₹{formatMoney(scanAmount)}
                        {merchant.billing_type === 'monthly' && (
                          <span className="text-[10px] text-slate-400 font-normal block">/month</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <QrIcon size={12} className="text-slate-400" />
                          {paidScans} / {totalScans}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-700">
                        ₹{formatMoney(totalCollected)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        ₹{formatMoney(gstCollected)}
                      </td>
                      <td className="py-4 px-6">
                        {lastTxnDate ? (
                          <span className="text-slate-600">{formatDate(lastTxnDate)}</span>
                        ) : (
                          <span className="text-slate-400">No payments yet</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedMerchantId(merchant.id)
                            scrollToLedger()
                          }}
                          disabled={totalTxns === 0}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          View Transactions
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── SECTION 2: All Transactions (filterable ledger) ─────────── */}
      <motion.div
        id="all-transactions-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ReceiptIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">All Transactions</h2>
              <p className="text-xs text-slate-500">Every payment across every merchant, with filters.</p>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search merchant, UTR, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:border-[#1857D6] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <ChevronDownIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-2 text-xs font-semibold text-slate-700 focus:border-[#1857D6] focus:outline-none cursor-pointer"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">Amount: High to Low</option>
                  <option value="amount_low">Amount: Low to High</option>
                </select>
                <ArrowUpDownIcon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <ChevronDownIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Date filter row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CalendarIcon size={14} className="text-slate-400 shrink-0" />
            {(
              [
                ['all', 'All Time'],
                ['today', 'Today'],
                ['7d', 'Last 7 Days'],
                ['30d', 'Last 30 Days'],
                ['month', 'This Month'],
                ['custom', 'Custom Range'],
              ] as [DatePreset, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDatePreset(value)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${datePreset === value
                  ? 'bg-[#1857D6] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {label}
              </button>
            ))}

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 focus:border-[#1857D6] focus:outline-none"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 focus:border-[#1857D6] focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Filtered summary strip */}
        <div className="flex items-center justify-between bg-slate-50/50 px-6 py-2.5 text-xs text-slate-600 border-b border-slate-100">
          <span>
            Showing <span className="font-semibold text-slate-900">{filteredTransactions.length}</span> transaction
            {filteredTransactions.length === 1 ? '' : 's'}
          </span>
          <span>
            Total (completed/approved): <span className="font-semibold text-emerald-700">₹{formatMoney(filteredTotal)}</span>
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
              <ReceiptIcon size={32} />
            </div>
            <p className="text-base font-semibold text-slate-800">No transactions match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Merchant</th>
                  <th className="py-4 px-6">Mode</th>
                  <th className="py-4 px-6 text-right">Base</th>
                  <th className="py-4 px-6 text-right">GST</th>
                  <th className="py-4 px-6 text-right">Total</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">UTR / Payment ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTransactions.map((txn) => {
                  const merchant = merchantById.get(txn.merchant_id)
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80">
                      <td className="py-4 px-6 whitespace-nowrap text-slate-600">{formatDate(txn.created_at)}</td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            setSelectedMerchantId(txn.merchant_id)
                          }}
                          className="font-bold text-slate-900 hover:text-[#1857D6] cursor-pointer text-left"
                        >
                          {merchant?.business_name || 'Unknown Merchant'}
                        </button>
                        {txn.billing_month && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Billing month: {txn.billing_month}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
                          {txn.payment_mode || txn.payment_method || 'razorpay'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {txn.base_amount !== null && txn.base_amount !== undefined
                          ? `₹${formatMoney(Number(txn.base_amount))}`
                          : '—'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {txn.gst_amount !== null && txn.gst_amount !== undefined
                          ? `₹${formatMoney(Number(txn.gst_amount))}`
                          : '—'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                        ₹{formatMoney(Number(txn.amount || 0))}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusStyles[txn.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-500">{txn.utr_number || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}