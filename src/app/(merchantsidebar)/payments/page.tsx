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
  AlertTriangle as AlertTriangleIcon,
  History as HistoryIcon,
  Hourglass as HourglassIcon,
} from 'lucide-react'
declare global {
  interface Window {
    Razorpay: any
  }
}

type BillingType = 'per_scan' | 'monthly'

const GST_RATE = 0.18

interface MerchantData {
  id: string
  business_name: string
  billing_rate: number
  category: string | null
  sub_category: string | null
  billing_type: BillingType | null
  created_at: string | null
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
  billing_month?: string | null // e.g. "2026-08" — matches a payment to the calendar month it was billed for
}

// ─────────────────────────────────────────────────────────────────────────
// Billing cycle model
// ─────────────────────────────────────────────────────────────────────────
// A calendar month's charges (scans, or the flat monthly fee) close at the
// end of that month, and the bill is DUE on the 1st of the following
// month.
//
// IMPORTANT: the pay button is only clickable on the 1st of the month
// (isFirstOfMonth). It is closed on every other day, even if the merchant
// has an overdue balance sitting unpaid — there is no "stays open all
// month" exception. If a merchant misses a 1st, their unpaid amount does
// NOT disappear or reset: it simply carries forward and gets bundled in
// automatically (shown as a separate line item) the next time the 1st
// comes around, when the window reopens for one day.
function getBillingBounds() {
  const now = new Date()
  const today = now.getDate()

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const previousMonthKey = `${previousMonthStart.getFullYear()}-${String(previousMonthStart.getMonth() + 1).padStart(2, '0')}`
  const previousMonthLabel = previousMonthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  // The due date for the just-closed (previous) month's bill is the 1st of
  // THIS calendar month — but the payment WINDOW only opens on the 1st
  // itself. Once that day has passed, the button stays locked until the
  // *next* occurrence of the 1st. So "dueDate" here always means "the next
  // date the pay button will actually be clickable" — never a date that
  // has already gone by.
  const nextDueDate = today === 1 ? currentMonthStart : nextMonthStart
  const dueDate = nextDueDate
  const dueDateLabel = dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  // Days remaining until that next due date. 0 if today IS the 1st (the
  // window is open right now).
  const daysRemaining = today === 1 ? 0 : Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const currentMonthLabel = currentMonthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return {
    today: now,
    todayLabel: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    currentMonthStart,
    currentMonthStartISO: currentMonthStart.toISOString(),
    currentMonthLabel,
    previousMonthKey,
    previousMonthLabel,
    dueDate,
    dueDateLabel,
    daysRemaining, // 0 = due today (the 1st), >0 = days left until next 1st (display only)
  }
}

// Builds "YYYY-MM" keys for every month from `startDate` up to (and including) `endMonthDate`.
function buildMonthKeysBetween(startDate: Date, endMonthDate: Date): { key: string; label: string; date: Date }[] {
  const months: { key: string; label: string; date: Date }[] = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endMonthDate.getFullYear(), endMonthDate.getMonth(), 1)

  let guard = 0
  while (cursor <= end && guard < 120) {
    months.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      label: cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      date: new Date(cursor),
    })
    cursor.setMonth(cursor.getMonth() + 1)
    guard++
  }
  return months
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

  const [subcategoryScanAmount, setSubcategoryScanAmount] = useState<number | null>(null)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)

  // IMPORTANT: getBillingBounds() calls `new Date()`. Computing this in a
  // useMemo means it runs during the very first render — which, for a
  // 'use client' component, happens once on the SERVER and once on the
  // CLIENT during hydration. If those two renders land on different
  // calendar dates/timezones, React throws a hydration mismatch error
  // pointing at whichever text node differs first (exactly what you saw
  // at the header <p>). Fix: compute it in useEffect so it ONLY ever runs
  // on the client, after mount — never during SSR.
  const [billing, setBilling] = useState<ReturnType<typeof getBillingBounds> | null>(null)

  useEffect(() => {
    setBilling(getBillingBounds())
  }, [])

  const {
    todayLabel,
    currentMonthStart,
    currentMonthStartISO,
    currentMonthLabel,
    previousMonthKey,
    previousMonthLabel,
    dueDateLabel,
    daysRemaining,
  } = billing ?? {
    todayLabel: '',
    currentMonthStart: new Date(0),
    currentMonthStartISO: new Date(0).toISOString(),
    currentMonthLabel: '',
    previousMonthKey: '',
    previousMonthLabel: '',
    dueDateLabel: '',
    daysRemaining: 0,
  }

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
        .select('id, business_name, billing_rate, category, sub_category, billing_type, created_at')
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

      const normalizedMerchant: MerchantData = {
        ...merchData,
        billing_type: (merchData.billing_type as BillingType) || 'per_scan',
      }
      setMerchant(normalizedMerchant)

      const isMonthlyMerchant = normalizedMerchant.billing_type === 'monthly'

      if (!isMonthlyMerchant) {
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
        .select('id, amount, status, created_at, billing_month')
        .eq('merchant_id', merchData.id)
        .order('created_at', { ascending: false })

      if (payError) {
        console.error('Error fetching merchant_payments:', payError)
      } else if (payData) {
        setPayments((payData as unknown as PaymentRecord[]))
      }
    } catch (err: unknown) {
      console.error('Full fetchData Exception:', err)
      setError(err instanceof Error ? err.message : 'Failed to load records.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isMonthlyMerchant = merchant?.billing_type === 'monthly'

  const scanBillingRate =
    subcategoryScanAmount !== null && subcategoryScanAmount > 0
      ? subcategoryScanAmount
      : merchant?.billing_rate && merchant.billing_rate > 0
        ? merchant.billing_rate
        : 4.0

  const rateSource: 'sub_category' | 'default' =
    subcategoryScanAmount !== null && subcategoryScanAmount > 0 ? 'sub_category' : 'default'

  const monthlyFeeBase = merchant?.billing_rate && merchant.billing_rate > 0 ? merchant.billing_rate : 0

  // ── Closed-month timeline (billable) + accruing current month ──
  // "Closed" months = every month before the current one. Their bill
  // becomes due on the 1st of the current month and stays payable every
  // day after that (nothing here waits for "the next 1st").
  const { unpaidMonths, isOverdue, cumulativeBase, cumulativeGst, cumulativeTotal } = useMemo(() => {
    if (!isMonthlyMerchant || !merchant) {
      return {
        unpaidMonths: [] as { key: string; label: string; date: Date }[],
        isOverdue: false,
        cumulativeBase: 0,
        cumulativeGst: 0,
        cumulativeTotal: 0,
      }
    }

    const accountStart = merchant.created_at ? new Date(merchant.created_at) : new Date()
    const previousMonthDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1)
    const closedMonths = buildMonthKeysBetween(accountStart, previousMonthDate)

    const paidMonthKeys = new Set(
      payments
        .filter((p) => p.status === 'approved' || p.status === 'completed')
        .map((p) => p.billing_month)
        .filter((m): m is string => !!m)
    )

    const unpaid = closedMonths.filter((m) => !paidMonthKeys.has(m.key))
    // Overdue = there's an unpaid month older than the one that just
    // became due — i.e. they missed a previous 1st. Used only to control
    // banner styling now, not to gate payment.
    const overdue = unpaid.some((m) => m.key !== previousMonthKey)

    const base = unpaid.length * monthlyFeeBase
    const gst = base * GST_RATE
    const total = base + gst

    return { unpaidMonths: unpaid, isOverdue: overdue, cumulativeBase: base, cumulativeGst: gst, cumulativeTotal: total }
  }, [isMonthlyMerchant, merchant, payments, monthlyFeeBase, currentMonthStart, previousMonthKey])

  const isMonthlyPaid = isMonthlyMerchant && unpaidMonths.length === 0

  // Payment is only accepted on the 1st of the month (today === 1), full
  // stop — no "stays open if overdue" exception. If a merchant misses the
  // 1st, their unpaid month(s) simply carry forward and get included
  // automatically the next time the 1st comes around.
  const isFirstOfMonth = daysRemaining === 0
  const canPayMonthlyNow = isMonthlyMerchant && isFirstOfMonth && unpaidMonths.length > 0

  const currentMonthPayment = useMemo(() => {
    if (!isMonthlyMerchant) return null
    return (
      payments.find(
        (p) => (p.status === 'approved' || p.status === 'completed') && p.billing_month === previousMonthKey
      ) || null
    )
  }, [isMonthlyMerchant, payments, previousMonthKey])

  // ── Per-scan branch ──────────────────────────────────────────────────
  const payableScans = useMemo(() => {
    if (isMonthlyMerchant) return []
    return scans.filter(
      (s) => !s.is_paid && s.payment_status !== 'paid' && new Date(s.created_at) < currentMonthStart
    )
  }, [scans, isMonthlyMerchant, currentMonthStart])

  const accruingScans = useMemo(() => {
    if (isMonthlyMerchant) return []
    return scans.filter(
      (s) => !s.is_paid && s.payment_status !== 'paid' && new Date(s.created_at) >= currentMonthStart
    )
  }, [scans, isMonthlyMerchant, currentMonthStart])

  const totalScansCount = scans.length
  const totalPayableScansCount = payableScans.length
  const totalAccruingScansCount = accruingScans.length
  const totalBillingAmount = totalPayableScansCount * scanBillingRate

  const outstandingBase = totalBillingAmount
  const outstandingGst = outstandingBase * GST_RATE
  const outstandingTotalWithGst = outstandingBase + outstandingGst
  const hasOutstandingPayment = totalPayableScansCount > 0 && outstandingTotalWithGst > 0

  // Same rule as the monthly branch: payment only opens on the 1st of the
  // month. isScanOverdue is kept for banner/messaging only.
  const isScanOverdue = payableScans.some((s) => new Date(s.created_at) < new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1))
  const canPayScansNow = isFirstOfMonth && totalPayableScansCount > 0

  // Breaks payable (unpaid, closed) scans down by the calendar month they
  // were created in, so you can see "August: N scans, ₹X" and
  // "July: N scans, ₹X" as separate rolled-forward line items instead of
  // one lump sum.
  const payableScansByMonth = useMemo(() => {
    if (isMonthlyMerchant) return [] as { key: string; label: string; count: number; amount: number }[]
    const map = new Map<string, { key: string; label: string; count: number; amount: number }>()
    for (const s of payableScans) {
      const d = new Date(s.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        existing.amount += scanBillingRate
      } else {
        map.set(key, { key, label, count: 1, amount: scanBillingRate })
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1))
  }, [payableScans, isMonthlyMerchant, scanBillingRate])

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

  const handlePayment = async () => {
    if (!merchant || !hasOutstandingPayment) return
    if (!canPayScansNow) {
      setError(`Payment only opens on ${dueDateLabel} (1st of the month).`)
      return
    }

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

  // --- MONTHLY SUBSCRIPTION PAYMENT: payable any day once a closed month
  // is unpaid. Pays off ALL unpaid closed months at once. ---
  const handleMonthlyPayment = async () => {
    if (!merchant || cumulativeTotal <= 0 || unpaidMonths.length === 0) return
    if (!canPayMonthlyNow) {
      setError(`Payment only opens on ${dueDateLabel} (1st of the month).`)
      return
    }
    if (typeof window === 'undefined' || !window.Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection and retry.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setPaymentSuccess(null)

    const billingMonths = unpaidMonths.map((m) => m.key)

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          payment_mode: 'monthly',
          billing_month: previousMonthKey,
          billing_months: billingMonths,
        }),
      })

      const orderData = await res.json()

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      const totalWithGst: number = orderData.total_amount ?? cumulativeTotal
      const monthsLabel =
        billingMonths.length > 1
          ? `${unpaidMonths[0].label} \u2013 ${unpaidMonths[unpaidMonths.length - 1].label}`
          : previousMonthLabel

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.brand_name || 'DAD',
        description:
          orderData.description ||
          `${merchant.business_name} \u2014 Monthly QR subscription (incl. 18% GST) \u2014 ${monthsLabel}`,
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
                billing_month: previousMonthKey,
                billing_months: billingMonths,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            setPaymentSuccess(
              `Subscription for ${monthsLabel} paid (\u20b9${formatMoney(totalWithGst)} incl. GST)! Your QR code is active.`
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

  if (!billing) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
      </div>
    )
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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {isMonthlyMerchant ? 'Monthly Subscription' : 'Monthly Bill'}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {isMonthlyMerchant
                  ? `Payment only opens on ${dueDateLabel} (1st of the month) for ${previousMonthLabel}'s fee. Missed months carry forward and must be paid together next time the 1st comes around.`
                  : `Payment only opens on ${dueDateLabel} (1st of the month) for ${previousMonthLabel}'s scans. Pay all outstanding scan charges together, plus 18% GST.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/payments/history')} // ⚠️ adjust to match your actual route
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              <HistoryIcon size={16} />
              <span> Monthly Bill History</span>
            </button>
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
          {/* Overdue banner — only appears when a month OLDER than last month is still unpaid */}
          {isOverdue && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
              <AlertTriangleIcon size={18} className="text-rose-600 shrink-0" />
              <span>
                You missed the 1st-of-the-month deadline for {unpaidMonths.length - (unpaidMonths.some((m) => m.key === previousMonthKey) ? 1 : 0)} earlier month(s).
                All unpaid months must be paid together — you can pay right now to reactivate your QR code.
              </span>
            </div>
          )}

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
              <h3 className="text-2xl font-bold text-slate-900">
                ₹{formatMoney(monthlyFeeBase * (1 + GST_RATE))}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ₹{formatMoney(monthlyFeeBase)} base + ₹{formatMoney(monthlyFeeBase * GST_RATE)} GST / month
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment Status
                </span>
                <div
                  className={`p-2 rounded-xl ${isMonthlyPaid
                    ? 'bg-emerald-50 text-emerald-600'
                    : isOverdue
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-amber-50 text-amber-600'
                    }`}
                >
                  {isMonthlyPaid ? <CalendarCheckIcon size={18} /> : <CalendarClockIcon size={18} />}
                </div>
              </div>
              <h3
                className={`text-2xl font-bold ${isMonthlyPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-slate-900'
                  }`}
              >
                {isMonthlyPaid ? 'Paid' : dueDateLabel}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isMonthlyPaid && currentMonthPayment
                  ? `Paid on ${formatDate(currentMonthPayment.created_at)}`
                  : isFirstOfMonth
                    ? 'Payment window is open today'
                    : isOverdue
                      ? `Deadline passed — payment reopens on ${dueDateLabel}`
                      : daysRemaining > 0
                        ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until payment opens`
                        : `Due today — 1st of ${currentMonthLabel}`}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Accruing — {currentMonthLabel}
                </span>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
                  <HourglassIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {scans.filter((s) => new Date(s.created_at) >= new Date(currentMonthStartISO)).length}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Not billed individually on this plan</p>
            </div>
          </div>

          {/* Monthly Payment Card */}
          <div
            className={`mb-8 rounded-3xl border p-6 shadow-sm sm:p-8 ${isMonthlyPaid
              ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white'
              : isOverdue
                ? 'border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white'
                : 'border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white'
              }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon
                className={isMonthlyPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-amber-600'}
                size={20}
              />
              <h2 className="text-lg font-bold text-slate-900">
                {unpaidMonths.length > 1 ? `${unpaidMonths.length} Months Due` : `${previousMonthLabel} Subscription`}
              </h2>
            </div>

            {isMonthlyPaid ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white border border-emerald-200 p-4">
                <CheckIcon size={20} className="text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-slate-700">
                  You're all set. Your QR code stays active and scans are unlimited.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {canPayMonthlyNow ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-blue-200 p-4">
                    <CheckIcon size={20} className="text-[#1857D6] shrink-0" />
                    <p className="text-sm font-medium text-slate-700">
                      {isOverdue
                        ? 'A previous month is overdue too — paying now settles everything and reactivates your QR code.'
                        : `Today is the due date (${dueDateLabel}) — payment is open now.`}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-4">
                    <CalendarClockIcon size={20} className="text-slate-500 shrink-0" />
                    <p className="text-sm font-medium text-slate-700">
                      Payment only opens on <span className="font-bold">{dueDateLabel}</span> (1st of the month).
                      {daysRemaining > 0 && ` ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to go.`}
                      {isOverdue && ' Unpaid months will carry forward and be included then.'}
                    </p>
                  </div>
                )}

                {/* Month-by-month breakdown — always shown while anything is unpaid,
                    so a rolled-forward month and the newly-closed month are both
                    visible as separate lines, not just lumped into one total. */}
                <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100">
                  {unpaidMonths.map((m) => (
                    <div key={m.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-600">
                        {m.label}
                        {m.key !== previousMonthKey && (
                          <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 align-middle">
                            CARRIED FORWARD
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-900">₹{formatMoney(monthlyFeeBase)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50/60">
                    <span className="text-slate-500">
                      {currentMonthLabel} <span className="text-[10px] font-semibold text-slate-400">(still accruing, not yet due)</span>
                    </span>
                    <span className="font-semibold text-slate-400">₹{formatMoney(monthlyFeeBase)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      {unpaidMonths.length > 1
                        ? `${unpaidMonths.length} months × ₹${formatMoney(monthlyFeeBase)}`
                        : 'Monthly fee (base)'}
                    </span>
                    <span>₹{formatMoney(cumulativeBase)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mt-1">
                    <span>GST (18%)</span>
                    <span>₹{formatMoney(cumulativeGst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100">
                    <span>Total Due Now</span>
                    <span>₹{formatMoney(cumulativeTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Amount Due</span>
                    <span className="text-2xl font-black text-[#1857D6]">₹{formatMoney(cumulativeTotal)}</span>
                  </div>

                  <button
                    onClick={handleMonthlyPayment}
                    disabled={isSubmitting || cumulativeTotal <= 0 || !canPayMonthlyNow}
                    aria-disabled={isSubmitting || cumulativeTotal <= 0 || !canPayMonthlyNow}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderIcon size={18} className="animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : !canPayMonthlyNow ? (
                      <span>Opens {dueDateLabel}</span>
                    ) : (
                      <>
                        <span>Pay ₹{formatMoney(cumulativeTotal)} Now</span>
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
                    <span className="text-slate-600">
                      {p.billing_month ? `${p.billing_month} · ` : ''}
                      {formatDate(p.created_at)}
                    </span>
                    <span className="font-semibold text-slate-900">₹{formatMoney(p.amount)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.status === 'approved' || p.status === 'completed'
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
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
                {totalPayableScansCount + totalAccruingScansCount} <span className="text-xs font-normal text-slate-400">/ {totalScansCount} total</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {totalPayableScansCount} payable now (₹{formatMoney(totalBillingAmount)}) · {totalAccruingScansCount} accruing
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Accruing — {currentMonthLabel}
                </span>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
                  <HourglassIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{totalAccruingScansCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Bills on {dueDateLabel.split(' ').slice(0, 2).join(' ') === dueDateLabel ? dueDateLabel : `1st of next month`}</p>
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
                {canPayScansNow ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-blue-200 p-4 mb-4">
                    <CheckIcon size={20} className="text-[#1857D6] shrink-0" />
                    <p className="text-sm font-medium text-slate-700">
                      Today is the due date ({dueDateLabel}) — payment is open now.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-4 mb-4">
                    <CalendarClockIcon size={20} className="text-slate-500 shrink-0" />
                    <p className="text-sm font-medium text-slate-700">
                      Payment only opens on <span className="font-bold">{dueDateLabel}</span> (1st of the month).
                      {daysRemaining > 0 && ` ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to go.`}
                      {isScanOverdue && ' Charges from more than one closed month will be included then.'}
                    </p>
                  </div>
                )}

                {/* Month-by-month breakdown of unpaid scans, so a rolled-forward
                    month (e.g. July) and the newly-closed month (e.g. August)
                    both show as separate line items instead of one lump sum. */}
                {payableScansByMonth.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 mb-4">
                    {payableScansByMonth.map((m) => (
                      <div key={m.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-slate-600">
                          {m.label}
                          {m.key !== previousMonthKey && (
                            <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 align-middle">
                              CARRIED FORWARD
                            </span>
                          )}
                          <span className="ml-2 text-xs text-slate-400">({m.count} scans)</span>
                        </span>
                        <span className="font-semibold text-slate-900">₹{formatMoney(m.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50/60">
                      <span className="text-slate-500">
                        {currentMonthLabel}{' '}
                        <span className="text-[10px] font-semibold text-slate-400">(still accruing, not yet due)</span>
                        <span className="ml-2 text-xs text-slate-400">({totalAccruingScansCount} scans)</span>
                      </span>
                      <span className="font-semibold text-slate-400">
                        ₹{formatMoney(totalAccruingScansCount * scanBillingRate)}
                      </span>
                    </div>
                  </div>
                )}

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
                    disabled={isSubmitting || !hasOutstandingPayment || !canPayScansNow}
                    aria-disabled={isSubmitting || !hasOutstandingPayment || !canPayScansNow}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderIcon size={18} className="animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : !canPayScansNow ? (
                      <span>Opens {dueDateLabel}</span>
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

          {/* Month heading + scanned customers list */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClockIcon size={18} className="text-[#1857D6]" />
              <h2 className="text-lg font-bold text-slate-900">{currentMonthLabel}</h2>
              <span className="text-xs font-semibold text-slate-400">Scanned customers</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">{totalScansCount} total scans</span>
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

          {/* Scans Table */}
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
                      const isAccruing = !isPaid && new Date(scan.created_at) >= currentMonthStart

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
                              ) : isAccruing ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  <HourglassIcon size={12} />
                                  Accruing (Not Yet Billable)
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