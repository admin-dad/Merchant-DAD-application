'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  FileBarChart,
  Users,
  Wallet,
  QrCode,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import jsPDF from 'jspdf'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface MerchantData {
  id: string
  business_name: string
}

interface ReferralRow {
  id: string
  referred_business_name: string
  status: string
  created_at: string
}

interface TransactionRow {
  id: string
  wallet_type: 'points' | 'cash'
  transaction_type: 'credit' | 'debit'
  amount: number
  description: string | null
  created_at: string
}

interface ScanRow {
  id: string
  customer_name: string | null
  customer_phone: string | null
  status: string
  created_at: string
}

type ReportKey = 'referrals' | 'points' | 'scans'

const COLORS = {
  blue: '#1857D6',
  green: '#3E7A1C',
  lightGreen: '#7BC142',
  amber: '#D97706',
  rose: '#E11D48',
  purple: '#9333EA',
  slate: '#64748B',
}

const PIE_COLORS = [COLORS.lightGreen, COLORS.amber, COLORS.rose, COLORS.slate]

// ─────────────────────────────────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => {
    const s = String(val ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(',')]
  rows.forEach((row) => lines.push(row.map(escape).join(',')))
  return lines.join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function downloadTablePDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  colWidths: number[]
) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.height
  const marginX = 14
  const startY = 40
  const rowHeight = 8
  let y = startY

  const drawHeader = () => {
    pdf.setFontSize(18)
    pdf.setTextColor(11, 15, 25)
    pdf.text(title, marginX, 20)
    pdf.setFontSize(10)
    pdf.setTextColor(100, 116, 139)
    pdf.text(subtitle, marginX, 27)
    pdf.setDrawColor(226, 232, 240)
    pdf.line(marginX, 32, pageWidth - marginX, 32)
  }

  const drawTableHeaderRow = (yPos: number) => {
    pdf.setFillColor(241, 245, 249)
    pdf.rect(marginX, yPos - 5.5, pageWidth - marginX * 2, rowHeight, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(51, 65, 85)
    let x = marginX + 2
    headers.forEach((h, i) => {
      pdf.text(h, x, yPos)
      x += colWidths[i]
    })
    return yPos + rowHeight
  }

  drawHeader()
  y = drawTableHeaderRow(y)

  pdf.setFontSize(9)
  pdf.setTextColor(30, 41, 59)

  rows.forEach((row) => {
    if (y > pageHeight - 20) {
      pdf.addPage()
      y = startY
      y = drawTableHeaderRow(y)
      pdf.setFontSize(9)
      pdf.setTextColor(30, 41, 59)
    }
    let x = marginX + 2
    row.forEach((cell, i) => {
      const text = String(cell ?? '')
      const truncated = text.length > 40 ? text.slice(0, 37) + '...' : text
      pdf.text(truncated, x, y)
      x += colWidths[i]
    })
    y += rowHeight
  })

  if (rows.length === 0) {
    pdf.setFontSize(10)
    pdf.setTextColor(148, 163, 184)
    pdf.text('No records found for this report.', marginX, y + 2)
  }

  pdf.save(filename)
}

// ─────────────────────────────────────────────────────────────────────────
// Chart data helpers — bucket rows into the last 6 months
// ─────────────────────────────────────────────────────────────────────────

function lastNMonthLabels(n: number) {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
    })
  }
  return out
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [scans, setScans] = useState<ScanRow[]>([])

  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
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

      const [{ data: refData }, { data: txData }, { data: scanData }] = await Promise.all([
        supabase
          .from('referrals')
          .select('id, referred_business_name, status, created_at')
          .eq('referrer_id', merchantData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('merchant_transactions')
          .select('id, wallet_type, transaction_type, amount, description, created_at')
          .eq('merchant_id', merchantData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('qr_scans')
          .select('id, customer_name, customer_phone, status, created_at')
          .eq('merchant_id', merchantData.id)
          .order('created_at', { ascending: false }),
      ])

      if (refData) setReferrals(refData as ReferralRow[])
      if (txData) setTransactions(txData as TransactionRow[])
      if (scanData) setScans(scanData as ScanRow[])

      setLoading(false)
    }

    fetchAll()
  }, [router, supabase])

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  // ── Chart data (memoized) ────────────────────────────────────────────

  const referralsChartData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const counts: Record<string, number> = {}
    referrals.forEach((r) => {
      const k = monthKey(r.created_at)
      counts[k] = (counts[k] || 0) + 1
    })
    let running = 0
    return months.map((m) => {
      running += counts[m.key] || 0
      return { month: m.label, New: counts[m.key] || 0, Cumulative: running }
    })
  }, [referrals])

  const pointsChartData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const earned: Record<string, number> = {}
    const spent: Record<string, number> = {}
    transactions
      .filter((t) => t.wallet_type === 'points')
      .forEach((t) => {
        const k = monthKey(t.created_at)
        if (t.transaction_type === 'credit') earned[k] = (earned[k] || 0) + t.amount
        else spent[k] = (spent[k] || 0) + t.amount
      })
    return months.map((m) => ({
      month: m.label,
      Earned: earned[m.key] || 0,
      Spent: spent[m.key] || 0,
    }))
  }, [transactions])

  const scanTrendData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const counts: Record<string, number> = {}
    scans.forEach((s) => {
      const k = monthKey(s.created_at)
      counts[k] = (counts[k] || 0) + 1
    })
    return months.map((m) => ({ month: m.label, Scans: counts[m.key] || 0 }))
  }, [scans])

  const scanStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    scans.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [scans])

  // ── Export handlers ────────────────────────────────────────────────
  const exportReferrals = (format: 'csv' | 'pdf') => {
    if (!merchant) return
    setExporting(`referrals-${format}`)
    const headers = ['Business Name', 'Status', 'Date']
    const rows = referrals.map((r) => [r.referred_business_name, r.status, formatDate(r.created_at)])

    if (format === 'csv') {
      downloadBlob(toCSV(headers, rows), `${merchant.business_name}_Referrals_Report.csv`, 'text/csv')
    } else {
      downloadTablePDF(
        'Referrals Report',
        `${merchant.business_name} • Generated ${new Date().toLocaleDateString('en-IN')}`,
        headers,
        rows,
        `${merchant.business_name}_Referrals_Report.pdf`,
        [80, 40, 60]
      )
    }
    setTimeout(() => setExporting(null), 400)
  }

  const exportPoints = (format: 'csv' | 'pdf') => {
    if (!merchant) return
    setExporting(`points-${format}`)
    const headers = ['Description', 'Wallet', 'Type', 'Amount', 'Date']
    const rows = transactions.map((t) => [
      t.description || 'Transaction',
      t.wallet_type,
      t.transaction_type,
      t.wallet_type === 'points' ? `${t.amount} Pts` : `₹${t.amount.toFixed(2)}`,
      formatDate(t.created_at),
    ])

    if (format === 'csv') {
      downloadBlob(toCSV(headers, rows), `${merchant.business_name}_Points_Report.csv`, 'text/csv')
    } else {
      downloadTablePDF(
        'Points & Cash Report',
        `${merchant.business_name} • Generated ${new Date().toLocaleDateString('en-IN')}`,
        headers,
        rows,
        `${merchant.business_name}_Points_Report.pdf`,
        [55, 25, 20, 30, 45]
      )
    }
    setTimeout(() => setExporting(null), 400)
  }

  const exportScans = (format: 'csv' | 'pdf') => {
    if (!merchant) return
    setExporting(`scans-${format}`)
    const headers = ['Customer', 'Phone', 'Status', 'Date']
    const rows = scans.map((s) => [
      s.customer_name || 'Walk-in Customer',
      s.customer_phone ? `+91 ${s.customer_phone}` : 'Not provided',
      s.status,
      formatDate(s.created_at),
    ])

    if (format === 'csv') {
      downloadBlob(toCSV(headers, rows), `${merchant.business_name}_QR_Scans_Report.csv`, 'text/csv')
    } else {
      downloadTablePDF(
        'QR Scans Report',
        `${merchant.business_name} • Generated ${new Date().toLocaleDateString('en-IN')}`,
        headers,
        rows,
        `${merchant.business_name}_QR_Scans_Report.pdf`,
        [55, 35, 30, 45]
      )
    }
    setTimeout(() => setExporting(null), 400)
  }

  // ── Loading / Error states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Reports Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load your reports.'}</p>
      </div>
    )
  }

  const reportDefs: {
    key: ReportKey
    title: string
    description: string
    icon: React.ReactNode
    count: number
    accent: string
    onCSV: () => void
    onPDF: () => void
  }[] = [
    {
      key: 'referrals',
      title: 'Referrals Report',
      description: 'Every merchant you\u2019ve referred, with current status and join date.',
      icon: <Users size={20} />,
      count: referrals.length,
      accent: 'blue',
      onCSV: () => exportReferrals('csv'),
      onPDF: () => exportReferrals('pdf'),
    },
    {
      key: 'points',
      title: 'Points & Cash Report',
      description: 'Full ledger of points earned and digital cash credits/debits.',
      icon: <Wallet size={20} />,
      count: transactions.length,
      accent: 'green',
      onCSV: () => exportPoints('csv'),
      onPDF: () => exportPoints('pdf'),
    },
    {
      key: 'scans',
      title: 'QR Scans Report',
      description: 'Customer scan history from your shop QR code.',
      icon: <QrCode size={20} />,
      count: scans.length,
      accent: 'purple',
      onCSV: () => exportScans('csv'),
      onPDF: () => exportScans('pdf'),
    },
  ]

  const accentClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-[#1857D6]' },
    green: { bg: 'bg-emerald-50', text: 'text-[#3E7A1C]' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <FileBarChart size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reports & Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visual trends and downloadable reports on referrals, points and QR scans.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-medium text-slate-500">
            <Calendar size={14} />
            <span>Last 6 months</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Referrals Trend — Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Referral Growth</h2>
              <p className="text-xs text-slate-500">Monthly new referrals vs. cumulative total.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={referralsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="New" stroke={COLORS.lightGreen} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Cumulative" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Points Earned vs Spent — Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C]">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Points Movement</h2>
              <p className="text-xs text-slate-500">Points earned vs. spent, by month.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pointsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Earned" fill={COLORS.lightGreen} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Spent" fill={COLORS.rose} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* QR Scan Volume — Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Scan Volume</h2>
              <p className="text-xs text-slate-500">Total QR scans per month.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={scanTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="Scans" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#scanGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Scan Status Breakdown — Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileBarChart size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Scan Outcomes</h2>
              <p className="text-xs text-slate-500">Breakdown of scan results, all-time.</p>
            </div>
          </div>
          {scanStatusData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
              No scan data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={scanStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {scanStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Export Report Cards */}
      <h2 className="mb-4 text-base font-semibold text-slate-900">Download Reports</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {reportDefs.map((report, i) => {
          const accent = accentClasses[report.accent]
          return (
            <motion.div
              key={report.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * i }}
              className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                  {report.icon}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {report.count} record{report.count === 1 ? '' : 's'}
                </span>
              </div>

              <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">{report.description}</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={report.onCSV}
                  disabled={exporting === `${report.key}-csv`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {exporting === `${report.key}-csv` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span>CSV</span>
                </button>
                <button
                  onClick={report.onPDF}
                  disabled={exporting === `${report.key}-pdf`}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {exporting === `${report.key}-pdf` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}