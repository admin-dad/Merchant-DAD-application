'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Receipt,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface MerchantData {
  id: string
  business_name: string
}

// Covers both monthly subscription payments and per-scan "outstanding"
// payments — both write into merchant_payments via /api/verify-payment.
// Extra fields (base_amount, gst_amount, payment_mode) are optional
// because older rows may predate those columns.
interface PaymentRecord {
  id: string
  amount: number
  base_amount?: number | null
  gst_amount?: number | null
  status: string
  created_at: string
  billing_month?: string | null
  payment_mode?: string | null
}

const GST_RATE = 0.18

export default function ScanPaymentHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)

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

      const { data: payData, error: payError } = await supabase
        .from('merchant_payments')
        .select('id, amount, base_amount, gst_amount, status, created_at, billing_month, payment_mode')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (!payError && payData) {
        setPayments(payData as unknown as PaymentRecord[])
      } else if (payError) {
        console.error('Error fetching payment history:', payError)
      }

      setLoading(false)
    }

    fetchHistory()
  }, [router, supabase])

  // ── Group into Today / Yesterday / Last 7 Days / Last 30 Days / by month ──
  const groupedPayments = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    const startOfMonth = new Date(startOfToday)
    startOfMonth.setDate(startOfMonth.getDate() - 30)

    const buckets: Record<string, PaymentRecord[]> = {}
    const bucketOrder: string[] = []

    const pushToBucket = (label: string, p: PaymentRecord) => {
      if (!buckets[label]) {
        buckets[label] = []
        bucketOrder.push(label)
      }
      buckets[label].push(p)
    }

    payments.forEach((p) => {
      const d = new Date(p.created_at)
      let label: string

      if (d >= startOfToday) label = 'Today'
      else if (d >= startOfYesterday) label = 'Yesterday'
      else if (d >= startOfWeek) label = 'Last 7 Days'
      else if (d >= startOfMonth) label = 'Last 30 Days'
      else label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

      pushToBucket(label, p)
    })

    const priority = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days']
    const fixed = priority.filter((label) => buckets[label])
    const monthBuckets = bucketOrder.filter((label) => !priority.includes(label))

    return [...fixed, ...monthBuckets].map((label) => ({ label, items: buckets[label] }))
  }, [payments])

  const totalPaid = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'approved' || p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  )

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

  const formatFullDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatMoney = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const describePayment = (p: PaymentRecord) => {
    if (p.payment_mode === 'monthly' || p.billing_month) {
      return p.billing_month ? `Monthly Subscription — ${p.billing_month}` : 'Monthly Subscription'
    }
    return 'Scan Charges Payment'
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
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-blue-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <History size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Point History
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Record of all scan billing & subscription payments made via Razorpay.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Slim stat strip */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2">
            <span className="text-sm font-bold text-slate-900">{payments.length}</span>
            <span className="text-[11px] font-semibold text-slate-500">total payments</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2">
            <span className="text-sm font-bold text-emerald-700">₹{formatMoney(totalPaid)}</span>
            <span className="text-[11px] font-semibold text-emerald-600">total paid</span>
          </div>
        </div>
      </div>

      {/* Grouped Payment List */}
      {groupedPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-20 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
            <Receipt size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No payments yet</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Your scan billing and subscription payments will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedPayments.map((group, groupIdx) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: groupIdx * 0.05 }}
            >
              <div className="mb-3 flex items-center gap-3 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400">
                  {group.items.length} payment{group.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {group.items.map((p) => {
                  const isSuccess = p.status === 'approved' || p.status === 'completed'
                  const base = p.base_amount ?? p.amount / (1 + GST_RATE)
                  const gst = p.gst_amount ?? p.amount - base

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50/50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {isSuccess ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {describePayment(p)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                              }`}
                            >
                              {p.status}
                            </span>
                            {formatFullDate(p.created_at)} · {formatTime(p.created_at)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Base ₹{formatMoney(base)} + GST ₹{formatMoney(gst)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        ₹{formatMoney(p.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}