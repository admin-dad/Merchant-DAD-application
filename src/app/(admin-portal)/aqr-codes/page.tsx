// app/admin-qr-codes/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  X,
  Smartphone,
  Clock,
  Store,
  Trophy,
  ScanLine,
  Users,
  RefreshCw,
  Download,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeCanvas } from 'qrcode.react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string
  business_name: string
  category: string
  sub_category: string | null
  status: string
  created_at: string
}

interface ScanRow {
  id: string
  merchant_id: string
  customer_name: string | null
  customer_phone: string | null
  status: string
  created_at: string
}

interface MerchantWithScans extends MerchantRow {
  scans: ScanRow[]
  scanCount: number
  rewardWins: number
  lastScanAt: string | null
}

type StatusFilter = 'all' | 'approved' | 'active' | 'pending' | 'rejected' | 'suspended'

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
]

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AdminQRCodesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [merchants, setMerchants] = useState<MerchantWithScans[]>([])
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithScans | null>(null)

  // ── Load ──────────────────────────────────────────────────────────
  const loadAll = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      const { data: admin, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('id', user.id)
        .single()

      if (adminError || !admin) {
        setAuthorized(false)
        setLoading(false)
        setRefreshing(false)
        return
      }

      setAuthorized(true)

      const [{ data: merchantData, error: merchantError }, { data: scanData, error: scanError }] =
        await Promise.all([
          supabase
            .from('merchants')
            .select('id, business_name, category, sub_category, status, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('qr_scans')
            .select('id, merchant_id, customer_name, customer_phone, status, created_at')
            .order('created_at', { ascending: false }),
        ])

      if (merchantError || scanError) {
        setError((merchantError || scanError)?.message || 'Could not load QR code data.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      const scansByMerchant = new Map<string, ScanRow[]>()
      ;(scanData || []).forEach((s) => {
        if (!scansByMerchant.has(s.merchant_id)) scansByMerchant.set(s.merchant_id, [])
        scansByMerchant.get(s.merchant_id)!.push(s)
      })

      const merged: MerchantWithScans[] = (merchantData || []).map((m) => {
        const scans = scansByMerchant.get(m.id) || []
        return {
          ...m,
          scans,
          scanCount: scans.length,
          rewardWins: scans.filter((s) => s.status === 'Reward Won').length,
          lastScanAt: scans[0]?.created_at ?? null,
        }
      })

      setMerchants(merged)
      setLoading(false)
      setRefreshing(false)
    },
    [supabase]
  )

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Keep the open modal's data fresh if a refresh happens while it's open
  useEffect(() => {
    if (!selectedMerchant) return
    const updated = merchants.find((m) => m.id === selectedMerchant.id)
    if (updated) setSelectedMerchant(updated)
  }, [merchants]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMerchants = merchants.length
    const totalScans = merchants.reduce((sum, m) => sum + m.scanCount, 0)
    const totalRewardWins = merchants.reduce((sum, m) => sum + m.rewardWins, 0)
    const activeMerchants = merchants.filter(
      (m) => m.status === 'approved' || m.status === 'active'
    ).length
    return { totalMerchants, totalScans, totalRewardWins, activeMerchants }
  }, [merchants])

  const visibleMerchants = useMemo(() => {
    let list = [...merchants]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (m) =>
          m.business_name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.sub_category || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter)
    }

    // Highest scan count first
    list.sort((a, b) => b.scanCount - a.scanCount)

    return list
  }, [merchants, search, statusFilter])

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // ── Render states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
            <QrCode size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">QR Code Tracking</h1>
            <p className="text-sm text-slate-500">All merchant QR codes and their customer scan activity.</p>
          </div>
        </div>
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#1857D6]' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Store size={18} />}
          label="Total Merchants"
          value={stats.totalMerchants.toLocaleString('en-IN')}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Active Merchants"
          value={stats.activeMerchants.toLocaleString('en-IN')}
          accent="from-violet-500/10 to-violet-500/5 text-violet-600"
        />
        <StatCard
          icon={<ScanLine size={18} />}
          label="Total QR Scans"
          value={stats.totalScans.toLocaleString('en-IN')}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
        <StatCard
          icon={<Trophy size={18} />}
          label="Reward Wins"
          value={stats.totalRewardWins.toLocaleString('en-IN')}
          accent="from-amber-500/10 to-amber-500/5 text-amber-600"
        />
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business or category..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visibleMerchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <QrCode size={26} />
            </div>
            <p className="text-sm font-medium text-slate-600">No merchants match your filters</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Merchant</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Scans</th>
                  <th className="px-5 py-3.5">Last Scan</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMerchants.map((merchant) => (
                  <tr key={merchant.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6] to-[#7BC142] text-xs font-semibold text-white">
                          {merchant.business_name.trim().charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{merchant.business_name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {merchant.category}
                            {merchant.sub_category ? ` · ${merchant.sub_category}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                          statusStyles[merchant.status] || statusStyles.pending
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {merchant.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1857D6]">
                        <ScanLine size={12} />
                        {merchant.scanCount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {merchant.lastScanAt ? formatDate(merchant.lastScanAt) : 'No scans yet'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedMerchant(merchant)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#1857D6] hover:text-[#1857D6] transition-colors cursor-pointer"
                      >
                        <QrCode size={13} />
                        View QR & Scans
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup modal */}
      <MerchantQRModal
        merchant={selectedMerchant}
        onClose={() => setSelectedMerchant(null)}
        formatDate={formatDate}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Merchant QR + Scan History popup
// ─────────────────────────────────────────────────────────────────────────

function MerchantQRModal({
  merchant,
  onClose,
  formatDate,
}: {
  merchant: MerchantWithScans | null
  onClose: () => void
  formatDate: (iso: string) => string
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const scanUrl = merchant ? `${origin}/scan?merchant=${merchant.id}` : ''

  const downloadPNG = () => {
    if (!merchant) return
    const canvas = document.getElementById('admin-merchant-qr-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = `${merchant.business_name.replace(/\s/g, '_')}_QR.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AnimatePresence>
      {merchant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <div className="mb-6 pr-8">
                <h2 className="text-xl font-semibold text-[#0B0F19]">{merchant.business_name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {merchant.category}
                  {merchant.sub_category ? ` · ${merchant.sub_category}` : ''} · Merchant ID:{' '}
                  {merchant.id.substring(0, 8)}...
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
                {/* QR side */}
                <div className="sm:col-span-4 flex flex-col items-center">
                  <div className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                    <QRCodeCanvas
                      id="admin-merchant-qr-canvas"
                      value={scanUrl}
                      size={160}
                      level="H"
                      includeMargin={false}
                      fgColor="#0B0F19"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <button
                    onClick={downloadPNG}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    Download PNG
                  </button>

                  <div className="mt-4 grid w-full grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-center">
                      <p className="text-lg font-bold text-slate-900">{merchant.scanCount}</p>
                      <p className="text-[11px] font-medium text-slate-500">Total Scans</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-center">
                      <p className="text-lg font-bold text-slate-900">{merchant.rewardWins}</p>
                      <p className="text-[11px] font-medium text-slate-500">Reward Wins</p>
                    </div>
                  </div>
                </div>

                {/* Scan history side */}
                <div className="sm:col-span-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Scan History</h3>
                    <span className="text-xs font-medium text-slate-400">
                      {merchant.scans.length} {merchant.scans.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                    {merchant.scans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                          <Smartphone size={26} />
                        </div>
                        <p className="text-sm font-medium text-slate-600">No scans yet</p>
                        <p className="mt-1 text-xs text-slate-400">
                          This merchant&apos;s QR code hasn&apos;t been scanned by any customer.
                        </p>
                      </div>
                    ) : (
                      merchant.scans.map((scan) => (
                        <div
                          key={scan.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 hover:border-slate-300 hover:bg-slate-50/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                              <Smartphone size={15} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {scan.customer_name || 'Walk-in Customer'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {scan.customer_phone ? `+91 ${scan.customer_phone}` : 'Phone not provided'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                scan.status === 'Reward Won'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : scan.status === 'No Win'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {scan.status}
                            </span>
                            <p className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-slate-400">
                              <Clock size={12} />
                              {formatDate(scan.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}