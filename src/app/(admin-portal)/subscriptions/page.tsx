'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard as CreditCardIcon,
  Building2 as BuildingIcon,
  Users as UsersIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Lock as LockIcon,
  Layers as LayersIcon,
  Sparkles as SparklesIcon,
  CalendarClock as CalendarClockIcon,
  X as XIcon,
  Trash2 as Trash2Icon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type BillingInterval = 'free' | 'monthly' | 'yearly'
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due'

interface PlanRow {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billing_interval: BillingInterval
  features: string[]
  is_active: boolean
  sort_order: number
  merchantCount: number // how many merchants currently on this plan (active)
}

interface SubscriptionRow {
  id: string
  merchant_id: string
  merchant_name: string
  plan_id: string
  plan_name: string
  status: SubscriptionStatus
  started_at: string
  current_period_end: string | null
}

const formatMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const formatDate = (isoDate: string | null) =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

function statusBadgeClasses(status: SubscriptionStatus) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'past_due') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'cancelled' || status === 'expired') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function billingIntervalLabel(interval: BillingInterval) {
  if (interval === 'monthly') return '/ month'
  if (interval === 'yearly') return '/ year'
  return 'forever'
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─────────────────────────────────────────────────────────────────────────
// Add Plan modal
// ─────────────────────────────────────────────────────────────────────────
interface AddPlanModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  nextSortOrder: number
}

function AddPlanModal({ open, onClose, onCreated, nextSortOrder }: AddPlanModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [features, setFeatures] = useState<string[]>([''])
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setName('')
    setSlug('')
    setSlugTouched(false)
    setDescription('')
    setPrice('')
    setBillingInterval('monthly')
    setFeatures([''])
    setIsActive(true)
    setSubmitting(false)
    setFormError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (submitting) return
    resetForm()
    onClose()
  }, [submitting, resetForm, onClose])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleFeatureChange = (index: number, value: string) => {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)))
  }

  const addFeatureRow = () => setFeatures((prev) => [...prev, ''])
  const removeFeatureRow = (index: number) => setFeatures((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    setFormError(null)

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim() || slugify(name)
    const numericPrice = billingInterval === 'free' ? 0 : Number(price)

    if (!trimmedName) return setFormError('Plan name is required.')
    if (!trimmedSlug) return setFormError('Slug is required.')
    if (billingInterval !== 'free' && (Number.isNaN(numericPrice) || numericPrice < 0)) {
      return setFormError('Enter a valid price of 0 or more.')
    }

    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean)

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || null,
          price: numericPrice,
          billing_interval: billingInterval,
          features: cleanFeatures,
          is_active: isActive,
          sort_order: nextSortOrder,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create plan (status ${res.status})`)
      }

      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create plan.')
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
                  <LayersIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Plan</h2>
                  <p className="text-xs text-slate-500 mt-0.5">New plans appear in the Plans table right away.</p>
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

              {/* Name + slug */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Plan name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Pro"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlug(slugify(e.target.value))
                    }}
                    placeholder="pro"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One line describing who this plan is for"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Billing interval + price */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Billing</label>
                  <div className="flex items-center gap-1.5">
                    {(['free', 'monthly', 'yearly'] as BillingInterval[]).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setBillingInterval(interval)}
                        className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                          billingInterval === interval
                            ? 'bg-[#1857D6] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={billingInterval === 'free' ? '0' : price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={billingInterval === 'free'}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Features</label>
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="e.g. Unlimited scans"
                        className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                      />
                      {features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeatureRow(index)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addFeatureRow}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#1857D6] hover:text-blue-700 transition-all cursor-pointer"
                >
                  <PlusIcon size={12} />
                  Add feature
                </button>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">Visible to merchants</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hidden plans stay in this table but can&apos;t be assigned.</p>
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
                {submitting ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Delete Plan modal
// ─────────────────────────────────────────────────────────────────────────
interface DeletePlanModalProps {
  plan: PlanRow | null
  onClose: () => void
  onDeleted: () => void
}

function DeletePlanModal({ plan, onClose, onDeleted }: DeletePlanModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    if (submitting) return
    setFormError(null)
    onClose()
  }, [submitting, onClose])

  const handleDelete = async () => {
    if (!plan) return
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(plan.id)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json?.error || `Failed to delete plan (status ${res.status})`)
      }

      onDeleted()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete plan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {plan && (
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
                <h2 className="text-base font-bold text-slate-900">Delete plan?</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  This removes <span className="font-semibold text-slate-700">{plan.name}</span> permanently. It can&apos;t be undone.
                </p>
              </div>
            </div>

            <div className="px-6 pt-4">
              {plan.merchantCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                  <AlertIcon size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {plan.merchantCount} merchant{plan.merchantCount === 1 ? ' is' : 's are'} currently on this plan.
                    Deleting it may affect their subscription records.
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
                {submitting ? 'Deleting...' : 'Delete Plan'}
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
export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [merchantSearch, setMerchantSearch] = useState('')
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false)
  const [planPendingDelete, setPlanPendingDelete] = useState<PlanRow | null>(null)

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

      // NOTE: same pattern as /admin/merchant-billing — this route only checks
      // that the caller is logged in. Add an admin-role check server-side
      // before shipping this to production.
      //
      // Fetched via /api/admin/subscriptions, which uses the Supabase
      // SERVICE ROLE key server-side to read subscription_plans and
      // merchant_subscriptions across all merchants (RLS only lets a
      // merchant see their own row — see subscriptions-schema.sql).
      const res = await fetch('/api/admin/subscriptions', { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load subscription data (status ${res.status})`)
      }

      setPlans((json.plans as PlanRow[]) || [])
      setSubscriptions((json.subscriptions as SubscriptionRow[]) || [])
    } catch (err: unknown) {
      console.error('Admin subscriptions fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load subscription data.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Derived ──────────────────────────────────────────────────────────
  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.sort_order - b.sort_order), [plans])

  const nextSortOrder = useMemo(
    () => (plans.length === 0 ? 0 : Math.max(...plans.map((p) => p.sort_order)) + 1),
    [plans]
  )

  const filteredSubscriptions = useMemo(() => {
    const term = merchantSearch.trim().toLowerCase()
    if (!term) return subscriptions
    return subscriptions.filter(
      (s) => s.merchant_name.toLowerCase().includes(term) || s.plan_name.toLowerCase().includes(term)
    )
  }, [subscriptions, merchantSearch])

  const stats = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.status === 'active')
    const mrr = activeSubs.reduce((sum, s) => {
      const plan = plans.find((p) => p.id === s.plan_id)
      if (!plan) return sum
      if (plan.billing_interval === 'monthly') return sum + plan.price
      if (plan.billing_interval === 'yearly') return sum + plan.price / 12
      return sum
    }, 0)
    return {
      totalPlans: plans.length,
      activeSubscriptions: activeSubs.length,
      totalMerchants: subscriptions.length,
      mrr,
    }
  }, [plans, subscriptions])

  // ── Auth gate ────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <LockIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Login Required</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Please log in to an authorized account to view subscription plans.
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
              <CreditCardIcon size={30} />
            </div>
            <div>
              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6] mb-1">
                Admin
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Subscription Plans
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Every merchant is on Free for now — add paid plans here whenever you&apos;re ready.
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
              onClick={() => setIsAddPlanOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1857D6] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer"
            >
              <PlusIcon size={16} />
              <span>Add Plan</span>
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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plans</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <LayersIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalPlans}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Subscriptions</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <SparklesIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.activeSubscriptions}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Merchants Tracked</span>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <BuildingIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalMerchants}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Est. MRR</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <CreditCardIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-600">₹{formatMoney(stats.mrr)}</h3>
          <p className="text-xs text-slate-400 mt-1">₹0 while every plan is Free</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Plans table ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Plans</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sortedPlans.length} plan{sortedPlans.length === 1 ? '' : 's'} · new plans slot straight into this table
                </p>
              </div>
            </div>

            {sortedPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <LayersIcon size={28} className="text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-800">No plans yet</p>
                <p className="mt-1 text-xs text-slate-500 mb-4">Add your first plan to get started.</p>
                <button
                  onClick={() => setIsAddPlanOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-[#1857D6] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 cursor-pointer"
                >
                  <PlusIcon size={16} />
                  Add Plan
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-6">Plan</th>
                      <th className="py-3.5 px-6">Price</th>
                      <th className="py-3.5 px-6">Features</th>
                      <th className="py-3.5 px-6">Merchants</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {sortedPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                          {plan.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">{plan.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-mono font-bold text-slate-900">
                            {plan.price === 0 ? 'Free' : `₹${formatMoney(plan.price)}`}
                          </p>
                          <p className="text-[11px] text-slate-400">{billingIntervalLabel(plan.billing_interval)}</p>
                        </td>
                        <td className="py-4 px-6">
                          {plan.features.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {plan.features.slice(0, 3).map((f, i) => (
                                <li key={i} className="text-[11px] text-slate-600">
                                  · {f}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1857D6]">
                            <UsersIcon size={11} />
                            {plan.merchantCount}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              plan.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {plan.is_active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setPlanPendingDelete(plan)}
                            title="Delete plan"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                          >
                            <Trash2Icon size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* ── Merchant subscriptions table ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Merchant Subscriptions</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filteredSubscriptions.length} merchant{filteredSubscriptions.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="relative sm:w-72">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search merchant or plan..."
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>
            </div>

            {filteredSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BuildingIcon size={28} className="text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-800">No merchants found</p>
                <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-6">Merchant</th>
                      <th className="py-3.5 px-6">Plan</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Started</th>
                      <th className="py-3.5 px-6">Renews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-slate-900">{sub.merchant_name}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1857D6]">
                            {sub.plan_name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClasses(
                              sub.status
                            )}`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">{formatDate(sub.started_at)}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <CalendarClockIcon size={12} className="text-slate-400" />
                            {sub.current_period_end ? formatDate(sub.current_period_end) : 'Never'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <AddPlanModal
        open={isAddPlanOpen}
        onClose={() => setIsAddPlanOpen(false)}
        onCreated={fetchData}
        nextSortOrder={nextSortOrder}
      />

      <DeletePlanModal
        plan={planPendingDelete}
        onClose={() => setPlanPendingDelete(null)}
        onDeleted={fetchData}
      />
    </div>
  )
}