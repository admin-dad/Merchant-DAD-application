'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  Loader2,
  AlertCircle,
  Plus,
  Users,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  History,
  Trophy
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
}

interface Transaction {
  id: string
  wallet_type: string 
  transaction_type: string
  amount: number
  description: string | null
  created_at: string
  category?: string
}

interface PointsSummary {
  points_balance: number
  joining_bonus_points: number
  referral_points_earned: number
  purchased_points: number
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function DigitalWalletPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Track B2B Scratch Card Wins specifically
  const [scratchCardPoints, setScratchCardPoints] = useState(0)

  // All balances come from the ledger view — single source of truth
  const [summary, setSummary] = useState<PointsSummary>({
    points_balance: 0,
    joining_bonus_points: 0,
    referral_points_earned: 0,
    purchased_points: 0,
  })

  // Used only internally to calculate the actual Razorpay charge — never displayed
  const [valuePerPoint, setValuePerPoint] = useState(1)

  // Custom Points Purchase Modal
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [selectedPoints, setSelectedPoints] = useState<number>(500)

  // ── Fetch Initial Data ──────────────────────────────────────────────
  const fetchWalletData = async () => {
    setLoading(true)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      router.push('/login')
      return
    }

    const merchantRes = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single()

    const { data: merchantData, error: merchantError } = merchantRes

    if (merchantError || !merchantData) {
      setError('Could not load your merchant profile.')
      setLoading(false)
      return
    }

    setMerchant(merchantData)

    const [configRes, summaryRes, txRes] = await Promise.all([
      supabase.from('points_config').select('value_per_point').eq('id', 1).single(),
      supabase
        .from('merchant_points_summary')
        .select('points_balance, joining_bonus_points, referral_points_earned, purchased_points')
        .eq('merchant_id', merchantData.id)
        .maybeSingle(),
      supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false }),
    ])

    if (!configRes.error && configRes.data) {
      setValuePerPoint(configRes.data.value_per_point || 1)
    }

    if (!summaryRes.error && summaryRes.data) {
      setSummary({
        points_balance: summaryRes.data.points_balance || 0,
        joining_bonus_points: summaryRes.data.joining_bonus_points || 0,
        referral_points_earned: summaryRes.data.referral_points_earned || 0,
        purchased_points: summaryRes.data.purchased_points || 0,
      })
    }

    if (!txRes.error && txRes.data) {
      const txs = txRes.data as Transaction[]
      setTransactions(txs)
      
      // Dynamically calculate points won strictly from B2B Scratch Cards
      const wonPoints = txs
        .filter(tx => 
          tx.transaction_type === 'credit' && 
          tx.wallet_type === 'points' && 
          tx.description?.toLowerCase().includes('scratch card')
        )
        .reduce((sum, tx) => sum + tx.amount, 0)
        
      setScratchCardPoints(wonPoints)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchWalletData()
  }, [router, supabase])

  const totalAvailablePoints = summary.points_balance
  const freePointsEarned = summary.joining_bonus_points + summary.referral_points_earned + scratchCardPoints

  // ── Helper to dynamically load Razorpay SDK ─────────────────────────
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // ── Handle Razorpay Checkout ────────────────────────────────────────
  const handleBuyPoints = async (pointsToBuy: number) => {
    if (!merchant || !merchant.id) {
      setError('Your merchant profile is still loading. Please wait a moment and try again.')
      return
    }
    if (!pointsToBuy || pointsToBuy <= 0) {
      setError('Enter a valid number of points greater than 0.')
      return
    }

    setPurchasing(true)
    setError(null)
    setSuccessMsg(null)

    const isScriptLoaded = await loadRazorpayScript()
    if (!isScriptLoaded || typeof window.Razorpay === 'undefined') {
      setError('Razorpay SDK failed to load. Please check your connection and try again.')
      setPurchasing(false)
      return
    }

    const amountInINR = pointsToBuy * valuePerPoint
    const merchantId = merchant.id

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchantId,
          payment_mode: 'custom',
          custom_amount: amountInINR,
        }),
      })

      let orderData: any = {}
      try {
        orderData = await res.json()
      } catch {
        throw new Error('Server returned an unexpected response. Please try again.')
      }

      if (!res.ok) {
        throw new Error(orderData?.error || `Failed to initialize payment (status ${res.status})`)
      }

      if (!orderData.order_id) {
        throw new Error('Payment order could not be created. Please try again.')
      }

      const options = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Merchant Points Purchase',
        description: `Purchase ${pointsToBuy} Reward Points`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                merchant_id: merchantId,
                amount: amountInINR,
                payment_mode: 'points_purchase',
              }),
            })

            const verifyData = await verifyRes.json()

            if (verifyRes.ok && verifyData.success) {
              const { error: txInsertError } = await supabase
                .from('merchant_transactions')
                .insert([
                  {
                    merchant_id: merchantId,
                    wallet_type: 'points',
                    transaction_type: 'credit',
                    amount: pointsToBuy,
                    description: `Purchased ${pointsToBuy} Points via Razorpay (${response.razorpay_payment_id})`,
                    category: 'purchase',
                  },
                ])

              if (txInsertError) {
                console.error('Failed to insert merchant transaction log:', txInsertError)
                setError(
                  `Payment succeeded but recording it failed. Contact support with payment ID: ${response.razorpay_payment_id}`
                )
                setPurchasing(false)
                return
              }

              setSuccessMsg(`Successfully added ${pointsToBuy} Points to your wallet!`)
              setShowBuyModal(false)
              await fetchWalletData()
            } else {
              setError(verifyData.error || 'Payment verification failed.')
            }
          } catch (err: any) {
            setError(err.message || 'Payment verification process encountered an error.')
          } finally {
            setPurchasing(false)
          }
        },
        prefill: {
          name: merchant.business_name,
        },
        theme: {
          color: '#1857D6',
        },
        modal: {
          ondismiss: function () {
            setPurchasing(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp: any) {
        setError(resp?.error?.description || 'Payment failed. Please try again.')
        setPurchasing(false)
      })
      rzp.open()
    } catch (err: any) {
      setError(err.message || 'Payment processing failed')
      setPurchasing(false)
    }
  }

  // ── Formatters ──────────────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

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
        <h2 className="text-xl font-semibold text-slate-900">Wallet Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

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
                Reward Points Wallet
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Buy, track, and manage all your reward points in one place.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            disabled={!merchant}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            <span>Buy Points</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Balance Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Total Available Points Card */}
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
            <Wallet size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Available Balance</p>
            <p className="text-2xl font-bold text-[#0B0F19]">
              {totalAvailablePoints.toLocaleString()} <span className="text-sm font-medium text-slate-400">Points</span>
            </p>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1857D6] hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Plus size={12} /> Buy
          </button>
        </div>

        {/* Free Points Earned summary */}
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C] transition-transform group-hover:scale-105">
            <Gift size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Points Earned Free</p>
            <p className="text-2xl font-bold text-[#0B0F19]">
              {freePointsEarned.toLocaleString()} <span className="text-sm font-medium text-slate-400">Points</span>
            </p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Bonus, referrals & rewards</p>
          </div>
        </div>
      </div>

      {/* Points Breakdown (Now 4 Cards to include B2B Scratch Card Rewards) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Joining Bonus */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Joining Bonus</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Sparkles size={16} className="text-[#1857D6]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {summary.joining_bonus_points} <span className="text-sm text-slate-400">Points</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">One-time registration reward</p>
        </div>

        {/* Referral Rewards */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referral Rewards</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Users size={16} className="text-amber-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {summary.referral_points_earned} <span className="text-sm text-slate-400">Points</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">From approved referrals</p>
        </div>

        {/* Scratch Card Wins (B2B Rewards) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">B2B Rewards</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Trophy size={16} className="text-purple-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {scratchCardPoints} <span className="text-sm text-slate-400">Points</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Won from Scratch Cards</p>
        </div>

        {/* Purchased Points */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchased Points</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ShoppingBag size={16} className="text-emerald-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {summary.purchased_points} <span className="text-sm text-slate-400">Points</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Bought via payments</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Ledger Column */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <History size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Points Ledger</h2>
                <p className="text-xs text-slate-500">History of all point transactions.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Wallet size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No transactions found</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">Buy points or win rewards to build your history.</p>
              </div>
            ) : (
              transactions
                .filter(tx => tx.wallet_type === 'points') // Failsafe ensure only points render
                .map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        tx.transaction_type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tx.description || 'Points Transaction'}</p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                          POINTS
                        </span>
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? '+' : '-'}{tx.amount} Points
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Purchase Card */}
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
              <h2 className="text-base font-semibold text-slate-900">Buy Points Packages</h2>
              <p className="text-xs text-slate-500">Instant credit via Razorpay.</p>
            </div>
          </div>

          <div className="space-y-3">
            {[100, 500, 1000, 2500,3000,3500,4000].map((pts) => (
              <div
                key={pts}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{pts} Points Package</p>
                </div>
                <button
                  onClick={() => handleBuyPoints(pts)}
                  disabled={purchasing}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {purchasing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  <span>Buy Now</span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Buy Points Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100"
            >
              <h3 className="text-lg font-bold text-slate-900">Purchase Reward Points</h3>
              <p className="text-xs text-slate-500 mt-1">Select or enter point quantity to buy.</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Number of Points</label>
                  <input
                    type="number"
                    min="10"
                    value={selectedPoints}
                    onChange={(e) => setSelectedPoints(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base font-bold text-slate-900 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 font-mono text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Points Requested:</span>
                    <span className="font-bold text-slate-900">{selectedPoints} Points</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBuyModal(false)}
                    className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBuyPoints(selectedPoints)}
                    disabled={purchasing || selectedPoints <= 0}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] py-2.5 text-xs font-semibold text-white shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {purchasing ? <Loader2 size={14} className="animate-spin" /> : 'Pay via Razorpay'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}