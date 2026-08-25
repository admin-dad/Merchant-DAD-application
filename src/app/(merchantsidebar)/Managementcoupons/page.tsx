'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket as TicketIcon,
  Building2 as BuildingIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Lock as LockIcon,
  CalendarClock as CalendarClockIcon,
  Image as ImageIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  ArrowUpRight as ArrowUpRightIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type DiscountType = 'percentage' | 'fixed'

interface CouponRow {
  id: string
  title: string
  description: string | null
  company_name: string
  image_url: string | null
  code: string | null
  discount_type: DiscountType
  discount_value: number
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
  usage_limit: number | null
  usage_count: number
  sort_order: number
  created_at: string
}

type StatusFilter = 'all' | 'active' | 'expired' | 'hidden'

const formatDate = (isoDate: string | null) =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

function discountLabel(coupon: Pick<CouponRow, 'discount_type' | 'discount_value'>) {
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`
  return `₹${coupon.discount_value.toLocaleString('en-IN')}`
}

function isExpired(coupon: CouponRow) {
  return !!coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()
}

function isUpcoming(coupon: CouponRow) {
  return !!coupon.starts_at && new Date(coupon.starts_at).getTime() > Date.now()
}

function statusInfo(coupon: CouponRow) {
  if (isExpired(coupon)) return { key: 'expired' as const, label: 'Expired', classes: 'bg-rose-50 text-rose-700 border-rose-200' }
  if (!coupon.is_active) return { key: 'hidden' as const, label: 'Hidden', classes: 'bg-slate-100 text-slate-500 border-slate-200' }
  if (isUpcoming(coupon)) return { key: 'active' as const, label: 'Upcoming', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { key: 'active' as const, label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

// ─────────────────────────────────────────────────────────────────────────
// Copy-to-clipboard code chip
// ─────────────────────────────────────────────────────────────────────────
function CodeChip({ code, full = false }: { code: string; full?: boolean }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — fail silently, chip still shows the code.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy code"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed transition-all cursor-pointer font-mono font-bold ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-300 bg-white text-slate-700 hover:border-[#1857D6] hover:text-[#1857D6]'
      } ${full ? 'w-full justify-center px-3 py-2 text-sm' : 'px-2.5 py-1 text-[11px]'}`}
    >
      {code}
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} className="opacity-60" />}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Coupon ticket card — the signature visual element of this page.
// A dashed tear-line with punched notches separates the offer from its
// redemption code, echoing a physical coupon stub.
// ─────────────────────────────────────────────────────────────────────────
function CouponCard({ coupon, onOpen }: { coupon: CouponRow; onOpen: () => void }) {
  const status = statusInfo(coupon)
  const muted = status.key !== 'active'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onOpen}
      className={`group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-[#1857D6]/30 ${
        muted ? 'opacity-70 hover:opacity-100' : ''
      }`}
    >
      {/* Image / visual header */}
      <div className="relative h-32 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200">
        {coupon.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coupon.image_url} alt={coupon.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <TicketIcon size={28} />
          </div>
        )}
        <span className={`absolute right-3 top-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${status.classes}`}>
          {status.label}
        </span>
        <span className="absolute left-3 bottom-3 inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1.5 font-mono text-sm font-extrabold text-white shadow-md">
          {discountLabel(coupon)} off
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4">
        <p className="line-clamp-1 text-sm font-bold text-slate-900">{coupon.title}</p>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <BuildingIcon size={11} className="text-slate-400" />
          {coupon.company_name}
        </span>
        {coupon.description && (
          <p className="line-clamp-2 text-xs text-slate-500 mt-0.5">{coupon.description}</p>
        )}
      </div>

      {/* Tear line with punched notches */}
      <div className="relative mx-4 my-3 border-t border-dashed border-slate-200">
        <span className="absolute -left-[27px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#F4F6FA]" />
        <span className="absolute -right-[27px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#F4F6FA]" />
      </div>

      {/* Footer: code + expiry */}
      <div className="flex items-center justify-between gap-2 px-4 pb-4">
        {coupon.code ? (
          <CodeChip code={coupon.code} />
        ) : (
          <span className="text-[11px] font-medium text-slate-400">No code needed</span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <CalendarClockIcon size={11} />
          {coupon.expires_at ? formatDate(coupon.expires_at) : 'No expiry'}
        </span>
      </div>

      {/* Hover affordance */}
      <div className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/0 text-transparent transition-all group-hover:bg-white group-hover:text-[#1857D6] group-hover:shadow-md" style={{ top: coupon.image_url || true ? undefined : undefined }} />
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Coupon detail modal (view-only)
// ─────────────────────────────────────────────────────────────────────────
function CouponDetailModal({ coupon, onClose }: { coupon: CouponRow | null; onClose: () => void }) {
  const status = coupon ? statusInfo(coupon) : null

  return (
    <AnimatePresence>
      {coupon && status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
          >
            <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
              {coupon.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coupon.image_url} alt={coupon.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <TicketIcon size={32} />
                </div>
              )}
              <span className={`absolute right-3 top-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.classes}`}>
                {status.label}
              </span>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{coupon.title}</h2>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <BuildingIcon size={12} className="text-slate-400" />
                  {coupon.company_name}
                </span>
              </div>

              {coupon.description && <p className="text-sm text-slate-600">{coupon.description}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Discount</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">{discountLabel(coupon)} off</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Redeemed</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {coupon.usage_count}
                    {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Starts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{coupon.starts_at ? formatDate(coupon.starts_at) : 'Now'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Expires</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{coupon.expires_at ? formatDate(coupon.expires_at) : 'Never'}</p>
                </div>
              </div>

              {coupon.code && (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-600">Coupon code</p>
                  <CodeChip code={coupon.code} full />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function MerchantCouponsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedCoupon, setSelectedCoupon] = useState<CouponRow | null>(null)

  // ── Fetch everything ────────────────────────────────────────────────
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

      // Read-only feed for merchants — served by /api/merchant/coupons,
      // which selects from admin_coupons under RLS (no service role key,
      // no write access). See /api/admin/coupons for the admin/write side.
      const res = await fetch('/api/merchant/coupons', { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load coupons (status ${res.status})`)
      }

      setCoupons((json.coupons as CouponRow[]) || [])
    } catch (err: unknown) {
      console.error('Merchant coupons fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Derived ──────────────────────────────────────────────────────────
  const sortedCoupons = useMemo(() => [...coupons].sort((a, b) => a.sort_order - b.sort_order), [coupons])

  const companyOptions = useMemo(() => {
    return Array.from(new Set(coupons.map((c) => c.company_name))).sort((a, b) => a.localeCompare(b))
  }, [coupons])

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sortedCoupons.filter((c) => {
      if (companyFilter !== 'all' && c.company_name !== companyFilter) return false
      if (statusFilter !== 'all' && statusInfo(c).key !== statusFilter) return false
      if (
        term &&
        !(
          c.title.toLowerCase().includes(term) ||
          c.company_name.toLowerCase().includes(term) ||
          (c.code || '').toLowerCase().includes(term)
        )
      )
        return false
      return true
    })
  }, [sortedCoupons, search, companyFilter, statusFilter])

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.is_active && !isExpired(c) && !isUpcoming(c))
    const companies = new Set(coupons.map((c) => c.company_name.trim().toLowerCase()))
    const redemptions = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0)
    return {
      totalCoupons: coupons.length,
      activeCoupons: active.length,
      totalCompanies: companies.size,
      totalRedemptions: redemptions,
    }
  }, [coupons])

  // ── Auth gate ────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <LockIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Merchant Login Required</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Please log in to a merchant account to view coupons.
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
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-[#F4F6FA] min-h-screen">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-blue-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <TicketIcon size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Coupons</h1>
              <p className="mt-0.5 text-sm text-slate-500">Browse every discount live across partner companies.</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50 sm:self-auto"
          >
            <RefreshIcon size={16} className={loading ? 'animate-spin text-[#1857D6]' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Slim stat strip */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2">
            <span className="text-sm font-bold text-slate-900">{stats.totalCoupons}</span>
            <span className="text-[11px] font-semibold text-slate-500">total coupons</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2">
            <span className="text-sm font-bold text-emerald-700">{stats.activeCoupons}</span>
            <span className="text-[11px] font-semibold text-emerald-600">active now</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2">
            <span className="text-sm font-bold text-slate-900">{stats.totalCompanies}</span>
            <span className="text-[11px] font-semibold text-slate-500">companies</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2">
            <span className="text-sm font-bold text-[#1857D6]">{stats.totalRedemptions}</span>
            <span className="text-[11px] font-semibold text-blue-500">redemptions</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertIcon size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
            ] as { key: StatusFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === opt.key ? 'bg-[#1857D6] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {companyOptions.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:border-[#1857D6] focus:outline-none cursor-pointer"
            >
              <option value="all">All companies</option>
              {companyOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <div className="relative sm:w-64">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, company or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 text-center px-4 shadow-sm">
          <TicketIcon size={28} className="text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-800">No coupons found</p>
          <p className="mt-1 text-xs text-slate-500">Try a different search or filter.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs font-medium text-slate-500">
            {filteredCoupons.length} coupon{filteredCoupons.length === 1 ? '' : 's'} · tap a card for full details
          </p>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filteredCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} onOpen={() => setSelectedCoupon(coupon)} />
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      <CouponDetailModal coupon={selectedCoupon} onClose={() => setSelectedCoupon(null)} />
    </div>
  )
}