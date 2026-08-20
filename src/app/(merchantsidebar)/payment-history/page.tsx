'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Loader2,
  AlertCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  ChevronDown,
  X,
  Inbox,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
}

interface Transaction {
  id: string
  wallet_type: string
  transaction_type: string // 'credit' | 'debit'
  amount: number
  description: string | null
  category?: string | null
  created_at: string
}

type TypeFilter = 'all' | 'credit' | 'debit'

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

const formatDayLabel = (isoDate: string) => {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const dayKey = (isoDate: string) => {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function PaymentHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [walletFilter, setWalletFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // ── Fetch Data ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

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

      const { data: txData, error: txError } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (txError) {
        setError('Could not load transaction history.')
      } else if (txData) {
        setTransactions(txData as Transaction[])
      }

      setLoading(false)
    }

    fetchHistory()
  }, [router, supabase])

  // ── Distinct wallet types for filter dropdown ───────────────────────
  const walletTypes = useMemo(() => {
    const set = new Set(transactions.map((t) => t.wallet_type).filter(Boolean))
    return Array.from(set)
  }, [transactions])

  // ── Apply filters ────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((tx) => {
      const matchesSearch =
        !searchTerm ||
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter
      const matchesWallet = walletFilter === 'all' || tx.wallet_type === walletFilter

      const txDate = new Date(tx.created_at)
      const matchesFrom = !dateFrom || txDate >= new Date(dateFrom + 'T00:00:00')
      const matchesTo = !dateTo || txDate <= new Date(dateTo + 'T23:59:59')

      return matchesSearch && matchesType && matchesWallet && matchesFrom && matchesTo
    })

    result = result.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })

    return result
  }, [transactions, searchTerm, typeFilter, walletFilter, dateFrom, dateTo, sortOrder])

  // ── Group by day for the timeline view ──────────────────────────────
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    filteredTransactions.forEach((tx) => {
      const key = dayKey(tx.created_at)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    })
    return Array.from(groups.entries()).map(([key, txs]) => ({
      key,
      label: formatDayLabel(txs[0].created_at),
      transactions: txs,
    }))
  }, [filteredTransactions])

  // ── Summary stats (based on filtered results) ───────────────────────
  const stats = useMemo(() => {
    const totalIn = filteredTransactions
      .filter((t) => t.transaction_type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalOut = filteredTransactions
      .filter((t) => t.transaction_type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  const hasActiveFilters =
    searchTerm !== '' || typeFilter !== 'all' || walletFilter !== 'all' || dateFrom !== '' || dateTo !== ''

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setWalletFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  // ── Render states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error && !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Could not load history</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
            <History size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Payment History</h1>
            <p className="mt-1 text-sm text-slate-500">
              Full record of every point credited to and debited from your wallet.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Points In</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">
            +{stats.totalIn.toLocaleString()} <span className="text-sm font-medium text-slate-400">Pts</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Total credited</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Points Out</span>
            <div className="p-2 bg-rose-50 rounded-lg">
              <TrendingDown size={16} className="text-rose-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">
            -{stats.totalOut.toLocaleString()} <span className="text-sm font-medium text-slate-400">Pts</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Total debited</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net Change</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wallet size={16} className="text-[#1857D6]" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${stats.net >= 0 ? 'text-[#1857D6]' : 'text-rose-600'}`}>
            {stats.net >= 0 ? '+' : ''}
            {stats.net.toLocaleString()} <span className="text-sm font-medium text-slate-400">Pts</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">In minus out</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Receipt size={16} className="text-purple-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.count.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Matching current filters</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            />
          </div>

          {/* Type filter */}
          <div className="relative min-w-[130px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-9 text-sm font-medium text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="all">All Types</option>
              <option value="credit">Points In</option>
              <option value="debit">Points Out</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Wallet filter */}
          {walletTypes.length > 1 && (
            <div className="relative min-w-[130px]">
              <select
                value={walletFilter}
                onChange={(e) => setWalletFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-9 text-sm font-medium text-slate-800 capitalize cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
              >
                <option value="all">All Wallets</option>
                {walletTypes.map((w) => (
                  <option key={w} value={w} className="capitalize">
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-2 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            />
          </div>

          {/* Sort */}
          <div className="relative min-w-[120px]">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-9 text-sm font-medium text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline / Transaction List */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {groupedByDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
              <Inbox size={32} />
            </div>
            <p className="text-sm font-semibold text-slate-800">No transactions found</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              {hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Your point history will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDay.map((group) => {
              const dayIn = group.transactions
                .filter((t) => t.transaction_type === 'credit')
                .reduce((s, t) => s + Number(t.amount), 0)
              const dayOut = group.transactions
                .filter((t) => t.transaction_type === 'debit')
                .reduce((s, t) => s + Number(t.amount), 0)

              return (
                <div key={group.key}>
                  {/* Sticky day header */}
                  <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-white/95 backdrop-blur-sm py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{group.label}</span>
                      <span className="text-xs text-slate-400">
                        · {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      {dayIn > 0 && <span className="text-emerald-600">+{dayIn}</span>}
                      {dayOut > 0 && <span className="text-rose-600">-{dayOut}</span>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.transactions.map((tx) => {
                      const isCredit = tx.transaction_type === 'credit'
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {isCredit ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {tx.description || 'Points Transaction'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                                  {tx.wallet_type}
                                </span>
                                {tx.category && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                                    {tx.category}
                                  </span>
                                )}
                                <span>{formatTime(tx.created_at)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isCredit ? '+' : '-'}
                              {tx.amount} Pts
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}