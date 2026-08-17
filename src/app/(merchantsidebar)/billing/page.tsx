'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Receipt,
  CreditCard,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  TrendingUp,
  Calendar,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
  billing_rate: number
}

interface PaymentRecord {
  id: string
  amount: number
  payment_method: string
  utr_number: string | null
  status: string
  created_at: string
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [totalScans, setTotalScans] = useState(0)
  const [monthlyScans, setMonthlyScans] = useState(0)
  const [todayScans, setTodayScans] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Form State for Manual Payment
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // ── Fetch Merchant Data, Scans & Payments ───────────────────────────────
  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, business_name, billing_rate')
        .eq('user_id', user.id)
        .single()

      if (merchantError || !merchantData) {
        setError('Could not load your merchant profile.')
        setLoading(false)
        return
      }

      setMerchant(merchantData)

      // Get scans to calculate bill
      const { data: scanData } = await supabase
        .from('qr_scans')
        .select('created_at')
        .eq('merchant_id', merchantData.id)
      
      if (scanData) {
        setTotalScans(scanData.length)
        
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        setTodayScans(scanData.filter(s => new Date(s.created_at) >= startOfToday).length)
        setMonthlyScans(scanData.filter(s => new Date(s.created_at) >= startOfMonth).length)
      }

      // Get payment history
      const { data: payData } = await supabase
        .from('merchant_payments')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (payData) {
        setPayments(payData as PaymentRecord[])
      }

      setLoading(false)
    }

    fetchBillingData()
  }, [router, supabase])

  // Calculate Billing Stats
  const totalBillAmount = totalScans * (merchant?.billing_rate || 0)
  const approvedPaymentsTotal = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)
  const outstandingAmount = Math.max(0, totalBillAmount - approvedPaymentsTotal)

  // ── Handle Manual Payment Submission ─────────────────────────────────
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant || !utr.trim() || outstandingAmount <= 0) return

    setSubmitting(true)

    const { error: insertError } = await supabase
      .from('merchant_payments')
      .insert([
        {
          merchant_id: merchant.id,
          amount: outstandingAmount,
          payment_method: 'manual',
          utr_number: utr.trim(),
          status: 'pending'
        }
      ])

    setSubmitting(false)

    if (insertError) {
      setError('Failed to submit payment. Please try again.')
      return
    }

    setSubmitSuccess(true)
    setUtr('')
    
    // Refresh payment list
    setTimeout(() => {
      setSubmitSuccess(false)
      window.location.reload()
    }, 2500)
  }

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
        <h2 className="text-xl font-semibold text-slate-900">Billing Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load billing data.'}</p>
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
              <Receipt size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Billing Summary
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your customer engagement charges and payment history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today's Billable</span>
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{todayScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Customers engaged today</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Billable</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Calendar size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{monthlyScans}</h3>
          <p className="text-xs text-slate-400 mt-1">Customers this month</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rate Per Customer</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><IndianRupee size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{merchant.billing_rate}</h3>
          <p className="text-xs text-slate-400 mt-1">Based on your category</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</span>
            <div className="p-2 bg-rose-50 rounded-lg"><CreditCard size={16} className="text-rose-500" /></div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">₹{outstandingAmount.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-1">Total Bill: ₹{totalBillAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Payment History (Left Column - 7/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Payment History</h2>
              <p className="text-xs text-slate-500">Track your past payments and approval status.</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Receipt size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No payments yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">Your payment history will appear here once you submit a payment.</p>
              </div>
            ) : (
              payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      pay.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : pay.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">₹{pay.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pay.payment_method.toUpperCase()} {pay.utr_number ? `• ${pay.utr_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      pay.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : pay.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {pay.status}
                    </span>
                    <p className="mt-1.5 text-xs text-slate-400">{formatDate(pay.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Pay Outstanding Bill Form (Right Column - 5/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pay Outstanding Bill</h2>
              <p className="text-xs text-slate-500">Upload UTR/Transaction ID for manual verification.</p>
            </div>
          </div>

          {outstandingAmount <= 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm font-semibold text-slate-800">All Caught Up!</p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">You have no outstanding bills. Keep engaging customers to grow your business!</p>
            </div>
          ) : submitSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm font-semibold text-slate-800">Payment Submitted!</p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">Your UTR is sent for Admin verification. Status will update shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount to Pay (₹)
                </label>
                <input
                  type="number"
                  value={outstandingAmount}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/60 px-4 py-3 text-sm font-bold text-slate-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  UTR / Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="Enter 12-digit UTR"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                />
                <p className="mt-1.5 text-xs text-slate-400">Pay to UPI ID: <span className="font-bold text-slate-600">business@upi</span> and enter the UTR here.</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !utr.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Submit for Verification
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  )
}