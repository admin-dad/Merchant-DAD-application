'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Gift,
  Loader2,
  AlertCircle,
  Plus,
  Users,
  Sparkles,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
  successful_referrals: number
}

interface Transaction {
  id: string
  wallet_type: 'points' | 'cash'
  transaction_type: 'credit' | 'debit'
  amount: number
  description: string | null
  created_at: string
}

export default function WalletRewardsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)

  const [cashBalance, setCashBalance] = useState(0)

  // Points config
  const [valuePerPoint, setValuePerPoint] = useState(0)
  const [pointsPerReferral, setPointsPerReferral] = useState(0)
  const [joiningBonusPoints, setJoiningBonusPoints] = useState(0)

  // ── Fetch Merchant Data & Transactions ───────────────────────────────
  useEffect(() => {
    const fetchWalletData = async () => {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const [merchantRes, configRes] = await Promise.all([
        supabase
          .from('merchants')
          .select('id, business_name, successful_referrals')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('points_config')
          .select('value_per_point, points_per_referral, joining_bonus_points')
          .eq('id', 1)
          .single(),
      ])

      const { data: merchantData, error: merchantError } = merchantRes

      if (merchantError || !merchantData) {
        setError('Could not load your merchant profile.')
        setLoading(false)
        return
      }

      setMerchant(merchantData)

      if (!configRes.error && configRes.data) {
        setValuePerPoint(configRes.data.value_per_point)
        setPointsPerReferral(configRes.data.points_per_referral)
        setJoiningBonusPoints(configRes.data.joining_bonus_points)
      }

      const { data: txData, error: txError } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (!txError && txData) {
        setTransactions(txData as Transaction[])
        
        // Calculate cash balance locally (points balance is now derived below)
        let cash = 0
        txData.forEach((tx: Transaction) => {
          if (tx.wallet_type === 'cash') {
            cash += tx.transaction_type === 'credit' ? tx.amount : -tx.amount
          }
        })
        setCashBalance(cash)
      }

      setLoading(false)
    }

    fetchWalletData()
  }, [router, supabase])

  // ── Derived Values ───────────────────────────────────────────────────
  const successfulReferrals = merchant?.successful_referrals || 0
  
  // Calculate specific reward buckets
  const referralPointsEarned = successfulReferrals * pointsPerReferral
  const referralPointsEarnedValue = referralPointsEarned * valuePerPoint
  const joiningBonusValue = joiningBonusPoints * valuePerPoint

  // Total Available Points = Joining Bonus + Referral Rewards
  const pointsBalance = joiningBonusPoints + referralPointsEarned
  const pointsBalanceValue = pointsBalance * valuePerPoint
  const referralPointsValue = pointsPerReferral * valuePerPoint

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
        <h2 className="text-xl font-semibold text-slate-900">Wallet Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load wallet data.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Wallet size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Wallet & Rewards
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your reward points, digital cash balance, and transaction history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Info Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Points Wallet Card */}
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
            <Gift size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Available Points</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{pointsBalance} <span className="text-sm font-medium text-slate-400">Pts</span></p>
            <p className="text-xs font-medium text-slate-400 font-mono">
              {pointsBalance} × ₹{valuePerPoint} = ₹{pointsBalanceValue.toFixed(2)}
            </p>
          </div>
        </div>
        
        {/* Cash Wallet Card */}
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C] transition-transform group-hover:scale-105">
            <CreditCard size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Digital Cash Balance</p>
            <p className="text-2xl font-bold text-[#0B0F19]">₹{cashBalance.toFixed(2)}</p>
            <p className="text-xs font-medium text-slate-400">Use for e-commerce checkout</p>
          </div>
          <button className="flex items-center gap-1 rounded-xl bg-[#7BC142]/10 px-3 py-1.5 text-xs font-semibold text-[#3E7A1C] hover:bg-[#7BC142]/20 transition-colors cursor-pointer">
            <Plus size={12} /> Add Money
          </button>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Joining Bonus Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Joining Bonus</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Sparkles size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{joiningBonusPoints} <span className="text-sm text-slate-400">Pts</span></h3>
          <p className="mt-1 text-xs font-mono text-slate-400">
            {joiningBonusPoints} × ₹{valuePerPoint} = ₹{joiningBonusValue.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">One-time reward for joining the platform</p>
        </div>

        {/* Referral Points Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referral Rewards</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Users size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{referralPointsEarned} <span className="text-sm text-slate-400">Pts</span></h3>
          <p className="mt-1 text-xs font-mono text-slate-400">
            {successfulReferrals} referral{successfulReferrals === 1 ? '' : 's'} × {pointsPerReferral} Pts × ₹{valuePerPoint} = ₹{referralPointsEarnedValue.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{successfulReferrals} successful referral{successfulReferrals === 1 ? '' : 's'} so far</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Transaction History (Left Column - 7/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Coins size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Transaction Ledger</h2>
              <p className="text-xs text-slate-500">Complete history of points and cash movements.</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="flex-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Wallet size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No transactions yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">When you earn points or add cash, it will appear here.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      tx.transaction_type === 'credit' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.transaction_type === 'credit' ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {tx.description || 'Transaction'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.wallet_type === 'points' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {tx.wallet_type}
                        </span>
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.transaction_type === 'credit' ? '+' : '-'}
                      {tx.wallet_type === 'points' ? `${tx.amount} Pts` : `₹${tx.amount.toFixed(2)}`}
                    </div>
                    {tx.wallet_type === 'points' && (
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {tx.amount} × ₹{valuePerPoint} = ₹{(tx.amount * valuePerPoint).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Redeem & Offers (Right Column - 5/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Redeem & Earn</h2>
              <p className="text-xs text-slate-500">Use your points or earn more.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Redeem Points Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1857D6]/5 to-[#7BC142]/5 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Redeem Points</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Use your available points to purchase products on the B2B & B2C E-Commerce platform. You can pay using Points + Wallet + Online Payment.
              </p>
              <p className="mt-2 text-[11px] font-mono text-slate-400">
                {pointsBalance} Pts × ₹{valuePerPoint} = ₹{pointsBalanceValue.toFixed(2)} available
              </p>
              <button 
                onClick={() => router.push('/shop')} 
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg cursor-pointer"
              >
                <CreditCard size={16} />
                Shop with Points
              </button>
            </div>

            {/* Earn More Card */}
            <div className="p-5 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Earn More Points</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Refer other merchants to the platform and earn {pointsPerReferral} Points for every successful referral!
              </p>
              <p className="mt-2 text-[11px] font-mono text-slate-400">
                {pointsPerReferral} × ₹{valuePerPoint} = ₹{referralPointsValue.toFixed(2)} per referral
              </p>
              <button 
                onClick={() => router.push('/referrals')} 
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                <Plus size={16} />
                Refer a Merchant
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}