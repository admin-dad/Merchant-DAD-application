'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  QrCode,
  Download,
  FileText,
  Printer,
  Share2,
  RefreshCw,
  History,
  CheckCircle2,
  Lock,
  Clock,
  Smartphone,
  Loader2,
  AlertCircle,
  ClipboardList,
  ArrowRight,
  CalendarClock,
  Wallet,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import jsPDF from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────
// Types matching your exact database schema
// ─────────────────────────────────────────────────────────────────────────
// 'per_scan' -> merchant is billed per unpaid scan (handled on the payments page)
// 'monthly'  -> merchant must pay a flat fee every calendar month, or the
//               QR code is hidden and treated as inactive.
type BillingType = 'per_scan' | 'monthly'

interface MerchantProfile {
  id: string
  business_name: string
  owner_name: string | null
  mobile: string | null
  email: string | null
  category: string
  sub_category: string | null
  house_floor: string | null
  district: string | null
  state: string | null
  country: string | null
  pincode: string | null
  status: string
  billing_type: BillingType | null
  billing_rate: number | null
}

interface ScanRecord {
  id: string
  customer_name: string | null
  status: string
  created_at: string
}

interface MonthlyPaymentRecord {
  id: string
  amount: number
  status: string
  created_at: string
}

// Fields that must be filled in on the Profile page before the QR code
// unlocks. Keep this in sync with the required-field validation on
// /profile so the two pages never disagree about what "complete" means.
const REQUIRED_FIELDS: { key: keyof MerchantProfile; label: string }[] = [
  { key: 'business_name', label: 'Business Name' },
  { key: 'owner_name', label: 'Owner Name' },
  { key: 'mobile', label: 'Mobile Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'category', label: 'Business Category' },
  { key: 'sub_category', label: 'Sub Category' },
  { key: 'house_floor', label: 'House / Floor No.' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'pincode', label: 'Pincode' },
]

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

// TODO: point this at your actual monthly-billing / scan-payment route.
const MONTHLY_PAYMENT_ROUTE = '/scan-payments'

function getCurrentMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    monthLabel: start.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
  }
}

export default function QRCodeManagementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [refreshingScans, setRefreshingScans] = useState(false)
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const [regenerateRequested, setRegenerateRequested] = useState(false)
  const [requestingRegen, setRequestingRegen] = useState(false)

  // Monthly billing gating
  const [isMonthlyPaid, setIsMonthlyPaid] = useState<boolean>(false)
  const [currentMonthPayment, setCurrentMonthPayment] = useState<MonthlyPaymentRecord | null>(null)

  const qrCanvasRef = useRef<HTMLDivElement>(null)

  const { startISO, endISO, monthLabel } = useMemo(() => getCurrentMonthBounds(), [])

  // ── Fetch Merchant Data & Scan History ───────────────────────────────
  const fetchMerchantData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshingScans(true)
    } else {
      setLoading(true)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      router.push('/login')
      return
    }

    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select(
        'id, business_name, owner_name, mobile, email, category, sub_category, house_floor, district, state, country, pincode, status, billing_type, billing_rate'
      )
      .eq('user_id', user.id)
      .single()

    if (merchantError || !merchantData) {
      setError('Could not load your merchant profile. Please ensure your account is fully set up.')
      setLoading(false)
      setRefreshingScans(false)
      return
    }

    // Default any merchant without an explicit billing_type to 'per_scan'
    // so existing merchants keep working exactly as before.
    const normalizedMerchant: MerchantProfile = {
      ...merchantData,
      billing_type: (merchantData.billing_type as BillingType) || 'per_scan',
    }
    setMerchant(normalizedMerchant)

    // Fetch Scans
    const { data: scanData, error: scanError } = await supabase
      .from('qr_scans')
      .select('id, customer_name, status, created_at')
      .eq('merchant_id', merchantData.id)
      .order('created_at', { ascending: false })

    if (!scanError && scanData) {
      setScans(scanData)
    }

    // Check if there is already a pending request for this merchant
    const { data: requestData } = await supabase
      .from('merchant_requests')
      .select('id')
      .eq('merchant_id', merchantData.id)
      .eq('request_type', 'QR_REGENERATION')
      .eq('status', 'pending')
      .maybeSingle()

    if (requestData) {
      setRegenerateRequested(true)
    }

    // For monthly-plan merchants, check whether the current calendar month
    // already has an approved/completed payment. If not, the QR code stays
    // hidden and inactive.
    if (normalizedMerchant.billing_type === 'monthly') {
      const { data: monthPayData, error: monthPayErr } = await supabase
        .from('merchant_payments')
        .select('id, amount, status, created_at')
        .eq('merchant_id', merchantData.id)
        .in('status', ['approved', 'completed'])
        .gte('created_at', startISO)
        .lt('created_at', endISO)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!monthPayErr && monthPayData && monthPayData.length > 0) {
        setIsMonthlyPaid(true)
        setCurrentMonthPayment(monthPayData[0] as MonthlyPaymentRecord)
      } else {
        setIsMonthlyPaid(false)
        setCurrentMonthPayment(null)
      }
    } else {
      // per_scan merchants are never blocked by the monthly gate
      setIsMonthlyPaid(true)
      setCurrentMonthPayment(null)
    }

    setLoading(false)
    setRefreshingScans(false)
  }, [router, supabase, startISO, endISO])

  useEffect(() => {
    fetchMerchantData()
  }, [fetchMerchantData])

  // ── Profile completeness check ───────────────────────────────────────
  const missingFields = merchant
    ? REQUIRED_FIELDS.filter((f) => !merchant[f.key] || String(merchant[f.key]).trim() === '')
    : REQUIRED_FIELDS

  const isProfileComplete = merchant !== null && missingFields.length === 0
  const isMonthlyMerchant = merchant?.billing_type === 'monthly'

  // The QR code is only unlocked when the profile is complete AND, for
  // monthly-plan merchants, the current month has been paid for.
  const isQrUnlocked = isProfileComplete && (!isMonthlyMerchant || isMonthlyPaid)

  // ── Download QR as PNG ──────────────────────────────────────────────
  const downloadPNG = () => {
    if (!merchant || !isQrUnlocked) return
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas) return

    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = `${merchant.business_name.replace(/\s/g, '_')}_QR.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  // ── Download QR as PDF ──────────────────────────────────────────────
  const downloadPDF = () => {
    if (!merchant || !isQrUnlocked) return
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas) return

    const pngData = canvas.toDataURL('image/png')
    const pdf = new jsPDF()
    pdf.setFontSize(20)
    pdf.setTextColor(11, 15, 25)
    pdf.text(merchant.business_name, 105, 30, { align: 'center' })
    pdf.setFontSize(12)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Merchant ID: ${merchant.id}`, 105, 40, { align: 'center' })
    pdf.text(`Category: ${merchant.category}${merchant.sub_category ? ` (${merchant.sub_category})` : ''}`, 105, 47, { align: 'center' })

    const imgWidth = 100
    const imgHeight = 100
    const x = (pdf.internal.pageSize.width - imgWidth) / 2
    const y = 60
    pdf.addImage(pngData, 'PNG', x, y, imgWidth, imgHeight)
    pdf.setFontSize(10)
    pdf.setTextColor(24, 87, 214)
    pdf.text('Scan to participate in exclusive campaigns & win rewards!', 105, 180, { align: 'center' })

    pdf.save(`${merchant.business_name.replace(/\s/g, '_')}_QR.pdf`)
  }

  // ── Print QR Code ───────────────────────────────────────────────────
  const printQR = () => {
    if (!merchant || !isQrUnlocked) return
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas) return

    const pngData = canvas.toDataURL('image/png')
    const printWindow = window.open('', '', 'width=600,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${merchant.business_name}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            h1 { font-size: 24px; color: #0B0F19; margin-bottom: 5px; }
            p { color: #64748B; margin: 2px 0 20px; font-size: 14px; }
            img { width: 300px; height: 300px; }
          </style>
        </head>
        <body>
          <h1>${merchant.business_name}</h1>
          <p>Merchant ID: ${merchant.id} | ${merchant.category}</p>
          <img src="${pngData}" />
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // ── Share QR Code ───────────────────────────────────────────────────
  const shareQR = async () => {
    if (!merchant || !isQrUnlocked) return
    const origin = window.location.origin
    const scanUrl = `${origin}/scan?merchant=${merchant.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${merchant.business_name} QR Code`,
          text: 'Scan this QR code to participate in campaigns and win rewards!',
          url: scanUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(scanUrl)
      alert('Share link copied to clipboard!')
    }
  }

  // ── Perfectly Working Regenerate Request ────────────────────────────
  const handleRegenerateRequest = async () => {
    if (!merchant) return
    setRequestingRegen(true)

    // Insert the request into the database
    const { error } = await supabase
      .from('merchant_requests')
      .insert([{
        merchant_id: merchant.id,
        request_type: 'QR_REGENERATION',
        status: 'pending'
      }])

    if (error) {
      alert(`Failed to send request: ${error.message}`)
      setRequestingRegen(false)
      return
    }

    setRegenerateRequested(true)
    setRequestingRegen(false)
  }

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
        <h2 className="text-xl font-semibold text-slate-900">Profile Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load merchant data.'}</p>
      </div>
    )
  }

  // Generate the scan URL for the QR Code
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const scanUrl = `${origin}/scan?merchant=${merchant.id}`
  const monthlyFee = merchant.billing_rate && merchant.billing_rate > 0 ? merchant.billing_rate : 0

  return (
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <QrCode size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  QR Code Management
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[merchant.status] || statusStyles.pending}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {merchant.status}
                </span>
                {isMonthlyMerchant && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      isMonthlyPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {isMonthlyPaid ? `Paid \u2013 ${monthLabel}` : `Unpaid \u2013 ${monthLabel}`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Display this code at your shop counter. Customers scan it to participate in campaigns and win rewards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isProfileComplete ? (
        // ── Profile incomplete: block QR code, prompt to finish profile ──
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm text-center sm:p-10"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-sm">
            <Lock size={30} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Complete your profile to unlock your QR code</h2>
          <p className="mt-2 text-sm text-slate-500">
            We generate your QR code from your business details, so all required profile fields need to be filled in first.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 text-left">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <ClipboardList size={14} />
              <span>Missing information ({missingFields.length})</span>
            </div>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {missingFields.map((f) => (
                <li key={f.key as string} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => router.push('/profile')}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg cursor-pointer sm:w-auto"
          >
            <span>Complete My Profile</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      ) : isMonthlyMerchant && !isMonthlyPaid ? (
        // ── Profile complete, but monthly fee unpaid: block QR code ─────
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-2xl rounded-3xl border border-rose-200/80 bg-white p-8 shadow-sm text-center sm:p-10"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
            <CalendarClock size={30} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Your QR code is inactive for {monthLabel}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your account is on the monthly plan. Pay this month's fee to reactivate your QR code
            &mdash; until then it stays hidden and won't work for customers.
          </p>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-rose-200/80 bg-rose-50/50 p-5 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Amount Due</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{monthlyFee.toFixed(2)}</p>
            </div>
            <Wallet size={28} className="text-rose-400" />
          </div>

          <button
            onClick={() => router.push(MONTHLY_PAYMENT_ROUTE)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg cursor-pointer sm:w-auto"
          >
            <span>Pay Monthly Fee</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      ) : (
        // ── QR unlocked: show QR code, actions & scan history ───────────
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: QR Display & Actions (5/12 width) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col self-start rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Download size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Download & Share</h2>
                <p className="text-xs text-slate-500">Print or share your unique QR code.</p>
              </div>
            </div>

            {/* QR Canvas */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div ref={qrCanvasRef} className="p-2 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                <QRCodeCanvas
                  id="merchant-qr-canvas"
                  value={scanUrl}
                  size={130}
                  level="H"
                  includeMargin={false}
                  fgColor="#0B0F19"
                  bgColor="#FFFFFF"
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{merchant.business_name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                ID: {merchant.id.substring(0, 8)}... • {merchant.category}
                {merchant.sub_category ? ` (${merchant.sub_category})` : ''}
              </p>
              {isMonthlyMerchant && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={12} />
                  Active for {monthLabel}
                </p>
              )}
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <ActionButton icon={<Download size={18} />} label="Download PNG" onClick={downloadPNG} variant="green" />
              <ActionButton icon={<FileText size={18} />} label="Download PDF" onClick={downloadPDF} variant="blue" />
              <ActionButton icon={<Printer size={18} />} label="Print QR" onClick={printQR} variant="slate" />
              <ActionButton icon={<Share2 size={18} />} label="Share QR" onClick={shareQR} variant="slate" />
            </div>
          </motion.div>

          {/* Right Column: Scan History (7/12 width) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col self-start rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Scan History</h2>
                  <p className="text-xs text-slate-500">Track customer participation and rewards.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMerchantData(true)}
                  disabled={refreshingScans}
                  aria-label="Refresh scan history"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={refreshingScans ? 'animate-spin text-[#1857D6]' : ''} />
                  <span>Refresh</span>
                </button>
                <span className="hidden sm:inline-block text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  Total Scans: {scans.length}
                </span>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3 overflow-y-auto pr-2 max-h-[420px]">
              {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                    <Smartphone size={32} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No scans yet</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs">When customers scan your QR code, their participation will appear here.</p>
                </div>
              ) : (
                scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {scan.customer_name ? `${scan.customer_name}` : 'Phone not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${scan.status === 'Reward Won'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : scan.status === 'No Win'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {scan.status}
                      </span>
                      <p className="mt-1.5 text-xs text-slate-400 flex items-center justify-end gap-1.5">
                        <Clock size={12} />
                        {formatDate(scan.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable Action Button
// ─────────────────────────────────────────────────────────────────────────
function ActionButton({
  icon, label, onClick, variant
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant: 'green' | 'blue' | 'slate'
}) {
  const variantClasses = {
    green: 'bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] text-white shadow-md shadow-emerald-500/20 hover:shadow-lg',
    blue: 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20 hover:shadow-lg',
    slate: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
  }

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-300 hover:translate-y-[-1px] cursor-pointer ${variantClasses[variant]}`}
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}