'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket as TicketIcon,
  Plus as PlusIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Lock as LockIcon,
  X as XIcon,
  Trash2 as Trash2Icon,
  Percent as PercentIcon,
  CalendarClock as CalendarClockIcon,
  Users as UsersIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type DiscountType = 'percentage' | 'fixed'

interface CouponRow {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_points: number
  max_redemptions: number | null
  redemption_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

function discountLabel(coupon: CouponRow) {
  return coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}% off`
    : `${coupon.discount_value} pts off`
}

const formatDate = (isoDate: string | null) =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

function isExpired(coupon: CouponRow) {
  return !!coupon.valid_until && new Date(coupon.valid_until).getTime() < Date.now()
}

function isExhausted(coupon: CouponRow) {
  return coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions
}

// ─────────────────────────────────────────────────────────────────────────
// Add Coupon modal
// ─────────────────────────────────────────────────────────────────────────
interface AddCouponModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function AddCouponModal({ open, onClose, onCreated }: AddCouponModalProps) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderPoints, setMinOrderPoints] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMinOrderPoints('')
    setMaxRedemptions('')
    setValidUntil('')
    setIsActive(true)
    setSubmitting(false)
    setFormError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (submitting) return
    resetForm()
    onClose()
  }, [submitting, resetForm, onClose])

  const handleSubmit = async () => {
    setFormError(null)

    const trimmedCode = code.trim().toUpperCase()
    const numericDiscount = Number(discountValue)

    if (!trimmedCode) return setFormError('Coupon code is required.')
    if (Number.isNaN(numericDiscount) || numericDiscount <= 0) {
      return setFormError('Enter a discount value greater than 0.')
    }
    if (discountType === 'percentage' && numericDiscount > 100) {
      return setFormError('Percentage discount cannot exceed 100.')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmedCode,
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: numericDiscount,
          min_order_points: minOrderPoints ? Number(minOrderPoints) : 0,
          max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          is_active: isActive,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create coupon (status ${res.status})`)
      }

      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-8"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
                  <TicketIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Coupon</h2>
                  <p className="text-xs text-slate-500 mt-0.5">New coupons appear in the table right away.</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                  <AlertIcon size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME50"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. New merchant welcome offer"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Discount type</label>
                  <div className="flex items-center gap-1.5">
                    {(['percentage', 'fixed'] as DiscountType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDiscountType(type)}
                        className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                          discountType === type
                            ? 'bg-[#1857D6] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {type === 'percentage' ? '% Percent' : 'Fixed'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Discount value {discountType === 'percentage' ? '(%)' : '(pts)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Min order + max redemptions */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Min order points</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderPoints}
                    onChange={(e) => setMinOrderPoints(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Max redemptions</label>
                  <input
                    type="number"
                    min={1}
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Valid until */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Expires on (optional)</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">Active immediately</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Inactive coupons stay in the table but can&apos;t be redeemed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                    isActive ? 'bg-[#1857D6]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#1857D6] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer disabled:opacity-60"
              >
                {submitting && <LoaderIcon size={14} className="animate-spin" />}
                {submitting ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Delete Coupon modal
// ─────────────────────────────────────────────────────────────────────────
interface DeleteCouponModalProps {
  coupon: CouponRow | null
  onClose: () => void
  onDeleted: () => void
}

function DeleteCouponModal({ coupon, onClose, onDeleted }: DeleteCouponModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    if (submitting) return
    setFormError(null)
    onClose()
  }, [submitting, onClose])

  const handleDelete = async () => {
    if (!coupon) return
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json?.error || `Failed to delete coupon (status ${res.status})`)
      }

      onDeleted()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {coupon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-8"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-3 px-6 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2Icon size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Delete coupon?</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  This removes <span className="font-mono font-semibold text-slate-700">{coupon.code}</span> permanently. It can&apos;t be undone.
                </p>
              </div>
            </div>

            <div className="px-6 pt-4">
              {coupon.redemption_count > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                  <AlertIcon size={14} className="shrink-0 mt-0.5" />
                  <span>
                    This coupon has already been redeemed {coupon.redemption_count} time
                    {coupon.redemption_count === 1 ? '' : 's'}. Deleting it won&apos;t affect past orders.
                  </span>
                </div>
              )}
              {formError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                  <AlertIcon size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-5">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-rose-700 cursor-pointer disabled:opacity-60"
              >
                {submitting && <LoaderIcon size={14} className="animate-spin" />}
                {submitting ? 'Deleting...' : 'Delete Coupon'}
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
export default function AdminCouponsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [couponPendingDelete, setCouponPendingDelete] = useState<CouponRow | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

      const couponsRes = await fetch('/api/admin/coupons', { cache: 'no-store' })
      const couponsJson = await couponsRes.json()
      if (!couponsRes.ok) {
        throw new Error(couponsJson?.error || `Failed to load coupons (status ${couponsRes.status})`)
      }
      setCoupons((couponsJson.coupons as CouponRow[]) || [])
    } catch (err: unknown) {
      console.error('Admin coupons fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.is_active && !isExpired(c) && !isExhausted(c))
    const totalRedemptions = coupons.reduce((sum, c) => sum + c.redemption_count, 0)
    return {
      total: coupons.length,
      active: active.length,
      totalRedemptions,
    }
  }, [coupons])

  const handleToggleActive = async (coupon: CouponRow) => {
    setTogglingId(coupon.id)
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || 'Failed to update coupon.')
      }
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon.')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Auth gate ────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <LockIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Login Required</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Please log in to an authorized account to view coupons.
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
              <TicketIcon size={30} />
            </div>
            <div>
              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6] mb-1">
                Admin
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Coupons</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Create and manage discount codes for subscription upgrades.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <RefreshIcon size={16} className={loading ? 'animate-spin text-[#1857D6]' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1857D6] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer"
            >
              <PlusIcon size={16} />
              <span>Add Coupon</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertIcon size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Coupons</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <TicketIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Currently Active</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <PercentIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.active}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Redemptions</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <UsersIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalRedemptions}</h3>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">All Coupons</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {coupons.length} coupon{coupons.length === 1 ? '' : 's'}
            </p>
          </div>

          {coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <TicketIcon size={28} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No coupons yet</p>
              <p className="mt-1 text-xs text-slate-500 mb-4">Create your first coupon to get started.</p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#1857D6] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer"
              >
                <PlusIcon size={16} />
                Add Coupon
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Code</th>
                    <th className="py-3.5 px-6">Discount</th>
                    <th className="py-3.5 px-6">Redemptions</th>
                    <th className="py-3.5 px-6">Expires</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {coupons.map((coupon) => {
                    const expired = isExpired(coupon)
                    const exhausted = isExhausted(coupon)
                    const effectivelyOff = !coupon.is_active || expired || exhausted

                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-6">
                          <p className="font-mono text-sm font-bold text-slate-900">{coupon.code}</p>
                          {coupon.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">{coupon.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                            {coupon.discount_type === 'percentage' && (
                              <PercentIcon size={11} className="text-[#1857D6]" />
                            )}
                            {discountLabel(coupon)}
                          </span>
                          {coupon.min_order_points > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Min order {coupon.min_order_points} pts
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            <UsersIcon size={11} />
                            {coupon.redemption_count}
                            {coupon.max_redemptions !== null && ` / ${coupon.max_redemptions}`}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <CalendarClockIcon size={12} className="text-slate-400" />
                            {formatDate(coupon.valid_until)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              !effectivelyOff
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {expired ? 'Expired' : exhausted ? 'Exhausted' : coupon.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleActive(coupon)}
                              disabled={togglingId === coupon.id || expired || exhausted}
                              title={coupon.is_active ? 'Deactivate' : 'Activate'}
                              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                coupon.is_active ? 'bg-[#1857D6]' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  coupon.is_active ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => setCouponPendingDelete(coupon)}
                              title="Delete coupon"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2Icon size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      <AddCouponModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={fetchData}
      />

      <DeleteCouponModal
        coupon={couponPendingDelete}
        onClose={() => setCouponPendingDelete(null)}
        onDeleted={fetchData}
      />
    </div>
  )
}