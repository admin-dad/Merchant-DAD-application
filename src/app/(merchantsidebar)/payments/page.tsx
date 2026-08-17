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
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Ban as BanIcon,
} from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface MerchantData {
  id: string
  business_name: string
  billing_rate: number
}

interface PointsConfig {
  id: number
  scan_bonus_rs: number | null
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

export default function MerchantScanPaymentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null)
  const [scans, setScans] = useState<QRScan[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set())
  const [paymentMode, setPaymentMode] = useState<'selected' | 'outstanding' | 'custom'>('selected')
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)

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

      const { data: configData, error: configError } = await supabase
        .from('points_config')
        .select('id, scan_bonus_rs')
        .eq('id', 1)
        .maybeSingle()

      if (configError) {
        console.error('Error fetching points_config:', configError)
      } else if (configData) {
        setPointsConfig(configData as PointsConfig)
      }

      const { data: merchData, error: merchError } = await supabase
        .from('merchants')
        .select('id, business_name, billing_rate')
        .eq('user_id', user.id)
        .maybeSingle()

      if (merchError || !merchData) {
        console.error('Error fetching merchant:', merchError)
        setError('Could not load merchant profile for this user.')
        setLoading(false)
        return
      }

      setMerchant(merchData)

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

  const scanBillingRate = pointsConfig?.scan_bonus_rs
    ? Number(pointsConfig.scan_bonus_rs)
    : merchant?.billing_rate && merchant.billing_rate > 0
    ? merchant.billing_rate
    : 4.0

  // All unpaid scans are payable
  const payableScans = useMemo(() => {
    return scans.filter((s) => !s.is_paid && s.payment_status !== 'paid')
  }, [scans])

  const totalScansCount = scans.length
  const totalPayableScansCount = payableScans.length
  const totalBillingAmount = totalPayableScansCount * scanBillingRate

  const totalPaid = payments
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const outstandingAmount = Math.max(0, totalBillingAmount - totalPaid)

  const selectedCount = selectedScanIds.size
  const selectedPayableAmount = selectedCount * scanBillingRate

  const finalPayAmount =
    paymentMode === 'selected'
      ? selectedPayableAmount
      : paymentMode === 'outstanding'
      ? outstandingAmount
      : parseFloat(customAmount) || 0

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

  const toggleSelectScan = (scan: QRScan) => {
    const isAlreadyPaid = scan.is_paid === true || scan.payment_status === 'paid'
    if (isAlreadyPaid) return

    const updated = new Set(selectedScanIds)
    if (updated.has(scan.id)) {
      updated.delete(scan.id)
    } else {
      updated.add(scan.id)
    }
    setSelectedScanIds(updated)
  }

  const toggleSelectAll = () => {
    const selectableFiltered = filteredScans.filter(
      (s) => !s.is_paid && s.payment_status !== 'paid'
    )

    if (selectedScanIds.size === selectableFiltered.length && selectableFiltered.length > 0) {
      setSelectedScanIds(new Set())
    } else {
      setSelectedScanIds(new Set(selectableFiltered.map((s) => s.id)))
    }
  }

  // --- PAYMENT HANDLING ---
  const handlePayment = async () => {
    if (!merchant || finalPayAmount <= 0) return

    if (typeof window === 'undefined' || !window.Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection and retry.')
      return
    }

    // Determine target scan IDs based on mode
    let targetScanIds: string[] = []
    if (paymentMode === 'selected') {
      targetScanIds = Array.from(selectedScanIds)
      if (targetScanIds.length === 0) {
        setError('Please select at least one scan to pay for.')
        return
      }
    } else if (paymentMode === 'outstanding') {
      targetScanIds = payableScans.map((s) => s.id)
    } else if (paymentMode === 'custom') {
      targetScanIds = Array.from(selectedScanIds)
      if (targetScanIds.length === 0) {
        const countToPay = Math.floor(finalPayAmount / scanBillingRate)
        targetScanIds = payableScans.slice(0, countToPay).map((s) => s.id)
      }
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
          scan_ids: targetScanIds,
          custom_amount: customAmount,
          payment_mode: paymentMode,
        }),
      })

      const orderData = await res.json()

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: merchant.business_name || 'Scan Payment',
        description: `Payment for QR Scans @ ₹${scanBillingRate}/scan`,
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
                amount: finalPayAmount,
                scan_ids: targetScanIds,
                payment_mode: paymentMode,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            setPaymentSuccess(`Payment of ₹${finalPayAmount.toFixed(2)} completed! All scans updated to Completed.`)
            setSelectedScanIds(new Set())
            setCustomAmount('')
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
              {merchant?.business_name && (
                <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6] mb-1">
                  {merchant.business_name}
                </span>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Scan Billing & Payments
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Select pending unpaid scans to make payments and mark them as Completed.
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
          <h3 className="text-2xl font-bold text-slate-900">₹{scanBillingRate.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-1">Per scan billing fee</p>
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
            Total ₹{totalBillingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Outstanding Balance
            </span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <ClockIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">
            ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Pending payment balance</p>
        </div>
      </div>

      {/* Payment Options */}
      <div className="mb-8 rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="text-[#1857D6]" size={20} />
          <h2 className="text-lg font-bold text-slate-900">Payment Summary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setPaymentMode('selected')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentMode === 'selected'
                ? 'border-[#1857D6] bg-white ring-2 ring-[#1857D6]/20 shadow-sm'
                : 'border-slate-200 bg-white/60 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase">Selected Scans</span>
              <span className="text-xs bg-blue-100 text-[#1857D6] font-bold px-2 py-0.5 rounded-full">
                {selectedCount} Selected
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              ₹{selectedPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">₹{scanBillingRate.toFixed(2)} × {selectedCount} scans</p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode('outstanding')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentMode === 'outstanding'
                ? 'border-[#1857D6] bg-white ring-2 ring-[#1857D6]/20 shadow-sm'
                : 'border-slate-200 bg-white/60 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Outstanding</span>
              <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                Full Balance
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">Pay all unpaid scan charges</p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode('custom')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentMode === 'custom'
                ? 'border-[#1857D6] bg-white ring-2 ring-[#1857D6]/20 shadow-sm'
                : 'border-slate-200 bg-white/60 hover:bg-white'
            }`}
          >
            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Custom Amount</span>
            {paymentMode === 'custom' ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full font-bold text-slate-900 border-b-2 border-[#1857D6] bg-transparent focus:outline-none"
                />
              </div>
            ) : (
              <p className="text-xl font-extrabold text-slate-900">Enter Amount</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Specify custom payment amount</p>
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Payable</span>
            <span className="text-2xl font-black text-[#1857D6]">
              ₹{finalPayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={handlePayment}
            disabled={isSubmitting || finalPayAmount <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <LoaderIcon size={18} className="animate-spin" />
                <span>Opening Razorpay...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{finalPayAmount.toFixed(2)} Now</span>
                <ArrowRightIcon size={18} />
              </>
            )}
          </button>
        </div>
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
                  <th className="py-4 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-[#1857D6] cursor-pointer"
                    >
                      {selectedScanIds.size > 0 ? (
                        <CheckSquareIcon size={18} className="text-[#1857D6]" />
                      ) : (
                        <SquareIcon size={18} />
                      )}
                    </button>
                  </th>
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
                  const isSelected = selectedScanIds.has(scan.id)

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => toggleSelectScan(scan)}
                      className={`transition-colors ${
                        isPaid
                          ? 'bg-slate-50/60 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/40 cursor-pointer'
                          : 'hover:bg-slate-50/80 cursor-pointer'
                      }`}
                    >
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={isPaid}
                          onClick={() => toggleSelectScan(scan)}
                          className={`cursor-pointer ${
                            isPaid ? 'cursor-not-allowed opacity-40' : 'text-slate-400 hover:text-[#1857D6]'
                          }`}
                        >
                          {isPaid ? (
                            <BanIcon size={18} className="text-slate-400" />
                          ) : isSelected ? (
                            <CheckSquareIcon size={18} className="text-[#1857D6]" />
                          ) : (
                            <SquareIcon size={18} />
                          )}
                        </button>
                      </td>

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
                          `₹${scanBillingRate.toFixed(2)}`
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
    </div>
  )
}