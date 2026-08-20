'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  QrCode as QrIcon,
  CheckCircle2 as CheckIcon,
  Clock as ClockIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Phone as PhoneIcon,
  User as UserIcon,
  Lock as LockIcon,
  CreditCard as CardIcon,
  Receipt as ReceiptIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Tag as TagIcon,
  CalendarClock as CalendarClockIcon,
  CalendarCheck as CalendarCheckIcon,
} from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

// 'per_scan'  -> merchant is billed for every unpaid scan (existing model)
// 'monthly'   -> merchant pays one flat fee per calendar month, scans are free
type BillingType = 'per_scan' | 'monthly'

// GST applied on top of whatever is due, for both billing types.
const GST_RATE = 0.18

interface MerchantData {
  id: string
  business_name: string
  billing_rate: number
  category: string | null
  sub_category: string | null
  billing_type: BillingType | null
}

interface QRScan {
  id: string
  merchant_id: string | null
  customer_name: string | null
  customer_phone: string | null
  status: string
  created_at: string
  prize_won: string | null
  fulfillment_status: string | null
  is_paid?: boolean | null
  payment_status?: string | null
}

interface PaymentRecord {
  id: string
  amount: number
  status: string
  created_at: string
}

// Returns the [startOfMonthISO, startOfNextMonthISO) bounds for "now"
function getCurrentMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: start.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
  }
}

const formatMoney = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function MerchantScanPaymentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [scans, setScans] = useState<QRScan[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  // Per-scan rate resolved from the merchant's own sub-category (per_scan merchants only)
  const [subcategoryScanAmount, setSubcategoryScanAmount] = useState<number | null>(null)

  // Monthly billing state
  const [isMonthlyPaid, setIsMonthlyPaid] = useState<boolean>(false)
  const [currentMonthPayment, setCurrentMonthPayment] = useState<PaymentRecord | null>(null)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)

  const { startISO, endISO, monthKey, monthLabel } = useMemo(() => getCurrentMonthBounds(), [])

  // Load Razorpay Checkout Script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

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

      const { data: merchData, error: merchError } = await supabase
        .from('merchants')
        .select('id, business_name, billing_rate, category, sub_category, billing_type')
        .eq('user_id', user.id)
        .maybeSingle()

      if (merchError || !merchData) {
        console.error('Error fetching merchant:', {
          message: merchError?.message,
          details: merchError?.details,
          hint: merchError?.hint,
          code: merchError?.code,
        })
        setError(merchError?.message || 'Could not load merchant profile for this user.')
        setLoading(false)
        return
      }

      // Default any merchant without an explicit billing_type to 'per_scan'
      // so existing merchants keep working exactly as before.
      const normalizedMerchant: MerchantData = {
        ...merchData,
        billing_type: (merchData.billing_type as BillingType) || 'per_scan',
      }
      setMerchant(normalizedMerchant)

      const isMonthlyMerchant = normalizedMerchant.billing_type === 'monthly'

      if (!isMonthlyMerchant) {
        // Resolve the per-scan rate from the merchant's own sub-category
        if (normalizedMerchant.category && normalizedMerchant.sub_category) {
          const { data: catRow, error: catErr } = await supabase
            .from('categories')
            .select('id')
            .eq('name', normalizedMerchant.category)
            .maybeSingle()

          if (!catErr && catRow) {
            const { data: subRow, error: subErr } = await supabase
              .from('subcategories')
              .select('scan_amount')
              .eq('category_id', catRow.id)
              .eq('name', normalizedMerchant.sub_category)
              .maybeSingle()

            if (!subErr && subRow && subRow.scan_amount !== null) {
              setSubcategoryScanAmount(Number(subRow.scan_amount))
            } else {
              setSubcategoryScanAmount(null)
            }
          } else {
            setSubcategoryScanAmount(null)
          }
        } else {
          setSubcategoryScanAmount(null)
        }
      }

      const { data: scanData, error: scanError } = await supabase
        .from('qr_scans')
        .select(
          'id, merchant_id, customer_name, customer_phone, status, prize_won, fulfillment_status, is_paid, payment_status, created_at'
        )
        .eq('merchant_id', merchData.id)
        .order('created_at', { ascending: false })

      if (scanError) {
        console.error('Error fetching qr_scans:', scanError)
        throw new Error(`Scans query error: ${scanError.message}`)
      }
      setScans((scanData as QRScan[]) || [])

      const { data: payData, error: payError } = await supabase
        .from('merchant_payments')
        .select('id, amount, status, created_at')
        .eq('merchant_id', merchData.id)
        .order('created_at', { ascending: false })

      if (payError) {
        console.error('Error fetching merchant_payments:', payError)
      } else if (payData) {
        setPayments(payData as PaymentRecord[])
      }

      // For monthly merchants, check whether the current calendar month
      // already has an approved/completed payment.
      if (isMonthlyMerchant) {
        const { data: monthPayData, error: monthPayErr } = await supabase
          .from('merchant_payments')
          .select('id, amount, status, created_at')
          .eq('merchant_id', merchData.id)
          .in('status', ['approved', 'completed'])
          .gte('created_at', startISO)
          .lt('created_at', endISO)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!monthPayErr && monthPayData && monthPayData.length > 0) {
          setIsMonthlyPaid(true)
          setCurrentMonthPayment(monthPayData[0] as PaymentRecord)
        } else {
          setIsMonthlyPaid(false)
          setCurrentMonthPayment(null)
        }
      }
    } catch (err: unknown) {
      console.error('Full fetchData Exception:', err)
      setError(err instanceof Error ? err.message : 'Failed to load records.')
    } finally {
      setLoading(false)
    }
  }, [supabase, startISO, endISO])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isMonthlyMerchant = merchant?.billing_type === 'monthly'

  // Priority: sub-category scan amount → merchant's own billing_rate → fallback
  // Only relevant for per_scan merchants.
  const scanBillingRate =
    subcategoryScanAmount !== null && subcategoryScanAmount > 0
      ? subcategoryScanAmount
      : merchant?.billing_rate && merchant.billing_rate > 0
      ? merchant.billing_rate
      : 4.0

  const rateSource: 'sub_category' | 'default' =
    subcategoryScanAmount !== null && subcategoryScanAmount > 0 ? 'sub_category' : 'default'

  // For monthly merchants, billing_rate is treated as the flat monthly subscription fee.
  const monthlyFeeBase = merchant?.billing_rate && merchant.billing_rate > 0 ? merchant.billing_rate : 0
  const monthlyGst = monthlyFeeBase * GST_RATE
  const monthlyTotalWithGst = monthlyFeeBase + monthlyGst

  // All unpaid scans are payable (per_scan merchants only)
  const payableScans = useMemo(() => {
    if (isMonthlyMerchant) return []
    return scans.filter((s) => !s.is_paid && s.payment_status !== 'paid')
  }, [scans, isMonthlyMerchant])

  const totalScansCount = scans.length
  const totalPayableScansCount = payableScans.length

  // totalBillingAmount already reflects ONLY the currently-unpaid scans
  // (payableScans filters out anything with is_paid / payment_status === 'paid').
  // Do NOT subtract lifetime totalPaid here — those payments already paid off
  // earlier scans and are excluded above, so subtracting again double-counts
  // them and can incorrectly zero out a genuinely outstanding balance.
  const totalBillingAmount = totalPayableScansCount * scanBillingRate

  // Lifetime total paid — shown for reference only, not used in the outstanding calc.
  const totalPaid = payments
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  // Base outstanding (pre-GST), then GST on top, then the single "pay all together" total.
  const outstandingBase = totalBillingAmount
  const outstandingGst = outstandingBase * GST_RATE
  const outstandingTotalWithGst = outstandingBase + outstandingGst
  const hasOutstandingPayment = totalPayableScansCount > 0 && outstandingTotalWithGst > 0

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      const matchesSearch =
        (scan.customer_phone || '').includes(searchTerm) ||
        scan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (scan.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFulfillment =
        fulfillmentFilter === 'ALL' || scan.fulfillment_status === fulfillmentFilter

      return matchesSearch && matchesFulfillment
    })
  }, [scans, searchTerm, fulfillmentFilter])

  // --- PER-SCAN PAYMENT HANDLING: always pays every outstanding scan together ---
  const handlePayment = async () => {
    if (!merchant || !hasOutstandingPayment) return

    if (typeof window === 'undefined' || !window.Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection and retry.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setPaymentSuccess(null)

    try {
      // The server (not this client) resolves the merchant's rate, the list of
      // outstanding scans, and the GST-inclusive total. We use exactly what it
      // returns for the Razorpay checkout and the verify-payment call below,
      // so what's displayed, what's charged, and what's recorded always match.
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          payment_mode: 'outstanding',
        }),
      })

      const orderData = await res.json()

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      const targetScanIds: string[] = Array.isArray(orderData.scan_ids) ? orderData.scan_ids : []
      const totalWithGst: number = orderData.total_amount ?? outstandingTotalWithGst

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.brand_name || 'DAD',
        description: orderData.description || `${merchant.business_name} \u2014 QR scan charges (incl. 18% GST)`,
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
                merchant_id: merchant.id,
                amount: totalWithGst,
                base_amount: orderData.base_amount,
                gst_amount: orderData.gst_amount,
                scan_ids: targetScanIds,
                payment_mode: 'outstanding',
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            setPaymentSuccess(
              `Payment of \u20b9${formatMoney(totalWithGst)} (incl. GST) completed! All scans updated to Completed.`
            )
            await fetchData()
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed')
          } finally {
            setIsSubmitting(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false)
          },
        },
        theme: {
          color: '#1857D6',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment.')
      setIsSubmitting(false)
    }
  }

  // --- MONTHLY SUBSCRIPTION PAYMENT HANDLING ---
  const handleMonthlyPayment = async () => {
    if (!merchant || monthlyTotalWithGst <= 0) return

    if (typeof window === 'undefined' || !window.Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection and retry.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setPaymentSuccess(null)

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          payment_mode: 'monthly',
          billing_month: monthKey, // e.g. "2026-08"
        }),
      })

      const orderData = await res.json()

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      const totalWithGst: number = orderData.total_amount ?? monthlyTotalWithGst

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.brand_name || 'DAD',
        description: orderData.description || `${merchant.business_name} \u2014 Monthly QR subscription (incl. 18% GST) \u2014 ${monthLabel}`,
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
                merchant_id: merchant.id,
                amount: totalWithGst,
                base_amount: orderData.base_amount,
                gst_amount: orderData.gst_amount,
                payment_mode: 'monthly',
                billing_month: monthKey,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            setPaymentSuccess(
              `Monthly subscription for ${monthLabel} paid (\u20b9${formatMoney(totalWithGst)} incl. GST)! Your QR code is active.`
            )
            await fetchData()
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed')
          } finally {
            setIsSubmitting(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false)
          },
        },
        theme: {
          color: '#1857D6',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment.')
      setIsSubmitting(false)
    }
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!loading && !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <LockIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Merchant Login Required</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Please log in to your merchant account to view and settle scan charges.
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
              <CardIcon size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {merchant?.business_name && (
                  <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6]">
                    {merchant.business_name}
                  </span>
                )}
                {merchant?.sub_category && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-600">
                    <TagIcon size={11} />
                    {merchant.sub_category}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    isMonthlyMerchant ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isMonthlyMerchant ? 'Monthly Plan' : 'Per-Scan Billing'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {isMonthlyMerchant ? 'Monthly Subscription' : 'Scan Billing & Payments'}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {isMonthlyMerchant
                  ? 'Pay your flat monthly fee (plus GST) to keep your QR code active. Scans are unlimited on this plan.'
                  : 'Pay all outstanding scan charges together, in one payment, plus 18% GST.'}
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

      {/* Messages */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertIcon size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {paymentSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
          <CheckIcon size={18} className="text-emerald-600 shrink-0" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {isMonthlyMerchant ? (
        <>
          {/* Monthly Overview Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Monthly Fee (+18% GST)
                </span>
                <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
                  <ReceiptIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">₹{formatMoney(monthlyTotalWithGst)}</h3>
              <p className="text-xs text-slate-400 mt-1">
                ₹{formatMoney(monthlyFeeBase)} base + ₹{formatMoney(monthlyGst)} GST
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {monthLabel}
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    isMonthlyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {isMonthlyPaid ? <CalendarCheckIcon size={18} /> : <CalendarClockIcon size={18} />}
                </div>
              </div>
              <h3 className={`text-2xl font-bold ${isMonthlyPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isMonthlyPaid ? 'Paid' : 'Unpaid'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isMonthlyPaid && currentMonthPayment
                  ? `Paid on ${formatDate(currentMonthPayment.created_at)}`
                  : 'QR code is inactive until paid'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scans This Month
                </span>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
                  <QrIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {scans.filter((s) => new Date(s.created_at) >= new Date(startISO)).length}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Not billed individually on this plan</p>
            </div>
          </div>

          {/* Monthly Payment Card */}
          <div
            className={`mb-8 rounded-3xl border p-6 shadow-sm sm:p-8 ${
              isMonthlyPaid
                ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white'
                : 'border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className={isMonthlyPaid ? 'text-emerald-600' : 'text-rose-600'} size={20} />
              <h2 className="text-lg font-bold text-slate-900">{monthLabel} Subscription</h2>
            </div>

            {isMonthlyPaid ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white border border-emerald-200 p-4">
                <CheckIcon size={20} className="text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-slate-700">
                  You're all set for {monthLabel}. Your QR code stays active and scans are unlimited
                  until next month's renewal.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white border border-rose-200 p-4">
                  <AlertIcon size={20} className="text-rose-600 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">
                    No payment found for {monthLabel} yet. Your QR code will not be visible or
                    usable until this month's fee is paid.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Monthly fee (base)</span>
                    <span>₹{formatMoney(monthlyFeeBase)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mt-1">
                    <span>GST (18%)</span>
                    <span>₹{formatMoney(monthlyGst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100">
                    <span>Total Due</span>
                    <span>₹{formatMoney(monthlyTotalWithGst)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Amount Due</span>
                    <span className="text-2xl font-black text-[#1857D6]">₹{formatMoney(monthlyTotalWithGst)}</span>
                  </div>

                  <button
                    onClick={handleMonthlyPayment}
                    disabled={isSubmitting || monthlyTotalWithGst <= 0}
                    aria-disabled={isSubmitting || monthlyTotalWithGst <= 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderIcon size={18} className="animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay ₹{formatMoney(monthlyTotalWithGst)} Now</span>
                        <ArrowRightIcon size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Subscription Payment History</h2>
            </div>
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-slate-500">No payments made yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 text-sm">
                    <span className="text-slate-600">{formatDate(p.created_at)}</span>
                    <span className="font-semibold text-slate-900">₹{formatMoney(p.amount)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        p.status === 'approved' || p.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rate Per Scan
                </span>
                <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
                  <ReceiptIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">₹{formatMoney(scanBillingRate)}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {rateSource === 'sub_category' && merchant?.sub_category
                  ? `Set for "${merchant.sub_category}"`
                  : 'Per scan billing fee (excl. GST)'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unpaid Scans
                </span>
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <QrIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {totalPayableScansCount} <span className="text-xs font-normal text-slate-400">/ {totalScansCount} total</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Base ₹{formatMoney(totalBillingAmount)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Outstanding (incl. GST)
                </span>
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <ClockIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-rose-600">
                ₹{formatMoney(outstandingTotalWithGst)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Pending payment balance</p>
            </div>
          </div>

          {/* Single Pay-All Card */}
          <div className="mb-8 rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="text-[#1857D6]" size={20} />
              <h2 className="text-lg font-bold text-slate-900">Pay All Outstanding Scans</h2>
            </div>

            {!hasOutstandingPayment ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white border border-emerald-200 p-4">
                <CheckIcon size={20} className="text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-slate-700">
                  You're all caught up — there are no unpaid scans right now.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 mb-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{totalPayableScansCount} unpaid scans × ₹{formatMoney(scanBillingRate)}</span>
                    <span>₹{formatMoney(outstandingBase)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mt-1">
                    <span>GST (18%)</span>
                    <span>₹{formatMoney(outstandingGst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100">
                    <span>Total Payable</span>
                    <span>₹{formatMoney(outstandingTotalWithGst)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Total Payable</span>
                    <span className="text-2xl font-black text-[#1857D6]">
                      ₹{formatMoney(outstandingTotalWithGst)}
                    </span>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isSubmitting || !hasOutstandingPayment}
                    aria-disabled={isSubmitting || !hasOutstandingPayment}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderIcon size={18} className="animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay ₹{formatMoney(outstandingTotalWithGst)} Now</span>
                        <ArrowRightIcon size={18} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer phone or scan ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <FilterIcon size={14} className="text-slate-500" />
              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1857D6] focus:outline-none"
              >
                <option value="ALL">All Scans</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Scans Table (view-only — payment is all-together, not per-scan) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
          >
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
              </div>
            ) : filteredScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <QrIcon size={32} />
                </div>
                <p className="text-base font-semibold text-slate-800">No scan records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">Scan ID & Date</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Reward / Status</th>
                      <th className="py-4 px-6">Fulfillment & Payment Status</th>
                      <th className="py-4 px-6 text-right">Fee Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredScans.map((scan) => {
                      const isPaid = scan.is_paid === true || scan.payment_status === 'paid'

                      return (
                        <tr key={scan.id} className={isPaid ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/80'}>
                          <td className="py-4 px-6">
                            <p className="font-mono font-bold text-slate-900">
                              #{scan.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(scan.created_at)}
                            </p>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              {scan.customer_name && (
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <UserIcon size={12} className="text-slate-400" />
                                  {scan.customer_name}
                                </span>
                              )}
                              <span className="font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                                <PhoneIcon size={12} className="text-slate-400" />
                                {scan.customer_phone || 'N/A'}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className="font-medium text-slate-800">
                              {scan.prize_won || scan.status || 'Standard Scan'}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1857D6] border border-blue-200">
                                  <CheckIcon size={12} />
                                  Completed & Paid
                                </span>
                              ) : scan.fulfillment_status === 'Pending' ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <ClockIcon size={12} />
                                  Pending (Pay to Complete)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckIcon size={12} />
                                  Completed (Unpaid)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                            {isPaid ? (
                              <span className="text-slate-400 text-xs">Paid</span>
                            ) : (
                              `₹${formatMoney(scanBillingRate)}`
                            )}
                          </td>
                        </tr>
                      )
                    })}
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