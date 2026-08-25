'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket as TicketIcon,
  Building2 as BuildingIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Lock as LockIcon,
  Sparkles as SparklesIcon,
  CalendarClock as CalendarClockIcon,
  X as XIcon,
  Trash2 as Trash2Icon,
  ImagePlus as ImagePlusIcon,
  Image as ImageIcon,
  Pencil as PencilIcon,
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

const formatDate = (isoDate: string | null) =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

// Converts an ISO date/timestamp string into the "YYYY-MM-DD" shape that
// <input type="date"> expects for its value.
const toDateInputValue = (isoDate: string | null) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function discountLabel(coupon: Pick<CouponRow, 'discount_type' | 'discount_value'>) {
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% off`
  return `₹${coupon.discount_value.toLocaleString('en-IN')} off`
}

function isExpired(coupon: CouponRow) {
  return !!coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()
}

function statusInfo(coupon: CouponRow) {
  if (isExpired(coupon)) return { label: 'Expired', classes: 'bg-rose-50 text-rose-700 border-rose-200' }
  if (!coupon.is_active) return { label: 'Hidden', classes: 'bg-slate-100 text-slate-500 border-slate-200' }
  return { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

// ─────────────────────────────────────────────────────────────────────────
// Shared coupon form fields (used by both Add and Edit modals)
// ─────────────────────────────────────────────────────────────────────────
interface CouponFormState {
  title: string
  description: string
  companyName: string
  code: string
  discountType: DiscountType
  discountValue: string
  startsAt: string
  expiresAt: string
  usageLimit: string
  isActive: boolean
}

const emptyForm: CouponFormState = {
  title: '',
  description: '',
  companyName: '',
  code: '',
  discountType: 'percentage',
  discountValue: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
}

// ─────────────────────────────────────────────────────────────────────────
// Add Coupon modal
// ─────────────────────────────────────────────────────────────────────────
interface AddCouponModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  nextSortOrder: number
}

function AddCouponModal({ open, onClose, onCreated, nextSortOrder }: AddCouponModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CouponFormState>(emptyForm)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageFilename, setImageFilename] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const resetForm = useCallback(() => {
    setForm(emptyForm)
    setImagePreview(null)
    setImageBase64(null)
    setImageFilename(null)
    setSubmitting(false)
    setFormError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    if (submitting) return
    resetForm()
    onClose()
  }, [submitting, resetForm, onClose])

  const handleImageChange = (file: File | null) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be 5MB or smaller.')
      return
    }
    setFormError(null)
    setImageFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      setImageBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setImageFilename(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    setFormError(null)

    const trimmedTitle = form.title.trim()
    const trimmedCompany = form.companyName.trim()
    const numericDiscount = Number(form.discountValue)

    if (!trimmedTitle) return setFormError('Coupon title is required.')
    if (!trimmedCompany) return setFormError('Company name is required.')
    if (Number.isNaN(numericDiscount) || numericDiscount < 0) {
      return setFormError('Enter a valid discount value of 0 or more.')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: form.description.trim() || null,
          company_name: trimmedCompany,
          code: form.code.trim() || null,
          discount_type: form.discountType,
          discount_value: numericDiscount,
          is_active: form.isActive,
          starts_at: form.startsAt || null,
          expires_at: form.expiresAt || null,
          usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
          sort_order: nextSortOrder,
          image_base64: imageBase64,
          image_filename: imageFilename,
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
                  <p className="text-xs text-slate-500 mt-0.5">New coupons appear in the Coupons table right away.</p>
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

              {/* Image upload */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                />
                {imagePreview ? (
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Coupon preview" className="h-36 w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-6 text-slate-400 hover:border-[#1857D6]/40 hover:text-[#1857D6] transition-all cursor-pointer"
                  >
                    <ImagePlusIcon size={20} />
                    <span className="text-xs font-semibold">Click to upload an image</span>
                    <span className="text-[11px] text-slate-400">PNG or JPG, up to 5MB</span>
                  </button>
                )}
              </div>

              {/* Title + company */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Festive 20% Off"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Company</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setField('companyName', e.target.value)}
                    placeholder="e.g. Acme Retail"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="One line describing what this coupon is for"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon code (optional)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE20"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
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
                        onClick={() => setField('discountType', type)}
                        className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                          form.discountType === type
                            ? 'bg-[#1857D6] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {type === 'percentage' ? '% Off' : '₹ Off'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Value {form.discountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', e.target.value)}
                    placeholder={form.discountType === 'percentage' ? '20' : '200'}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Starts (optional)</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setField('startsAt', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Expires (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setField('expiresAt', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">Visible to customers</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hidden coupons stay in this table but can&apos;t be applied.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('isActive', !form.isActive)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                    form.isActive ? 'bg-[#1857D6]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-5' : 'translate-x-0.5'
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
// Edit Coupon modal
// ─────────────────────────────────────────────────────────────────────────
interface EditCouponModalProps {
  coupon: CouponRow | null
  onClose: () => void
  onUpdated: () => void
}

function EditCouponModal({ coupon, onClose, onUpdated }: EditCouponModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CouponFormState>(emptyForm)

  // Existing image coming from the coupon row (public URL), a freshly
  // picked replacement image (base64), and whether the user cleared it.
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageFilename, setImageFilename] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Whenever a new coupon is passed in (modal opened for that row),
  // hydrate the form with its current values.
  useEffect(() => {
    if (!coupon) return
    setForm({
      title: coupon.title,
      description: coupon.description || '',
      companyName: coupon.company_name,
      code: coupon.code || '',
      discountType: coupon.discount_type,
      discountValue: String(coupon.discount_value ?? ''),
      startsAt: toDateInputValue(coupon.starts_at),
      expiresAt: toDateInputValue(coupon.expires_at),
      usageLimit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
      isActive: coupon.is_active,
    })
    setExistingImageUrl(coupon.image_url)
    setImageBase64(null)
    setImageFilename(null)
    setImageRemoved(false)
    setSubmitting(false)
    setFormError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [coupon])

  const handleClose = useCallback(() => {
    if (submitting) return
    onClose()
  }, [submitting, onClose])

  const handleImageChange = (file: File | null) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be 5MB or smaller.')
      return
    }
    setFormError(null)
    setImageFilename(file.name)
    setImageRemoved(false)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImageBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setExistingImageUrl(null)
    setImageBase64(null)
    setImageFilename(null)
    setImageRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // What to actually show in the preview box: a freshly picked image wins,
  // otherwise fall back to the coupon's existing stored image.
  const previewSrc = imageBase64 || existingImageUrl

  const handleSubmit = async () => {
    if (!coupon) return
    setFormError(null)

    const trimmedTitle = form.title.trim()
    const trimmedCompany = form.companyName.trim()
    const numericDiscount = Number(form.discountValue)

    if (!trimmedTitle) return setFormError('Coupon title is required.')
    if (!trimmedCompany) return setFormError('Company name is required.')
    if (Number.isNaN(numericDiscount) || numericDiscount < 0) {
      return setFormError('Enter a valid discount value of 0 or more.')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          title: trimmedTitle,
          description: form.description.trim() || null,
          company_name: trimmedCompany,
          code: form.code.trim() || null,
          discount_type: form.discountType,
          discount_value: numericDiscount,
          is_active: form.isActive,
          starts_at: form.startsAt || null,
          expires_at: form.expiresAt || null,
          usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
          sort_order: coupon.sort_order,
          image_base64: imageBase64,
          image_filename: imageFilename,
          remove_image: imageRemoved,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to update coupon (status ${res.status})`)
      }

      onUpdated()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update coupon.')
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
                  <PencilIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Coupon</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Changes save straight to the Coupons table.</p>
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

              {/* Image upload */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                />
                {previewSrc ? (
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewSrc} alt="Coupon preview" className="h-36 w-full object-cover" />
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Replace image"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-[#1857D6] transition-all cursor-pointer"
                      >
                        <ImagePlusIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        title="Remove image"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-rose-600 transition-all cursor-pointer"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-6 text-slate-400 hover:border-[#1857D6]/40 hover:text-[#1857D6] transition-all cursor-pointer"
                  >
                    <ImagePlusIcon size={20} />
                    <span className="text-xs font-semibold">Click to upload an image</span>
                    <span className="text-[11px] text-slate-400">PNG or JPG, up to 5MB</span>
                  </button>
                )}
              </div>

              {/* Title + company */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Festive 20% Off"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Company</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setField('companyName', e.target.value)}
                    placeholder="e.g. Acme Retail"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="One line describing what this coupon is for"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                />
              </div>

              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coupon code (optional)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE20"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
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
                        onClick={() => setField('discountType', type)}
                        className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                          form.discountType === type
                            ? 'bg-[#1857D6] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {type === 'percentage' ? '% Off' : '₹ Off'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Value {form.discountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', e.target.value)}
                    placeholder={form.discountType === 'percentage' ? '20' : '200'}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Starts (optional)</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setField('startsAt', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Expires (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setField('expiresAt', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1857D6] focus:outline-none"
                  />
                </div>
              </div>



              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">Visible to customers</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hidden coupons stay in this table but can&apos;t be applied.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('isActive', !form.isActive)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                    form.isActive ? 'bg-[#1857D6]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-5' : 'translate-x-0.5'
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
                {submitting ? 'Saving...' : 'Save Changes'}
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
                  This removes <span className="font-semibold text-slate-700">{coupon.title}</span> permanently. It can&apos;t be undone.
                </p>
              </div>
            </div>

            <div className="px-6 pt-4">
              {coupon.usage_count > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                  <AlertIcon size={14} className="shrink-0 mt-0.5" />
                  <span>
                    This coupon has already been used {coupon.usage_count} time{coupon.usage_count === 1 ? '' : 's'}.
                    Deleting it won&apos;t affect past redemptions.
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
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [couponPendingEdit, setCouponPendingEdit] = useState<CouponRow | null>(null)
  const [couponPendingDelete, setCouponPendingDelete] = useState<CouponRow | null>(null)

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

      // NOTE: same pattern as /admin/subscriptions — this route only checks
      // that the caller is logged in. Add an admin-role check server-side
      // before shipping this to production.
      //
      // Fetched via /api/admin/coupons, which uses the Supabase SERVICE
      // ROLE key server-side to read/write admin_coupons and upload images
      // to the "coupon-images" storage bucket (see coupons-schema.sql).
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load coupons (status ${res.status})`)
      }

      setCoupons((json.coupons as CouponRow[]) || [])
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

  // ── Derived ──────────────────────────────────────────────────────────
  const sortedCoupons = useMemo(() => [...coupons].sort((a, b) => a.sort_order - b.sort_order), [coupons])

  const nextSortOrder = useMemo(
    () => (coupons.length === 0 ? 0 : Math.max(...coupons.map((c) => c.sort_order)) + 1),
    [coupons]
  )

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sortedCoupons
    return sortedCoupons.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.company_name.toLowerCase().includes(term) ||
        (c.code || '').toLowerCase().includes(term)
    )
  }, [sortedCoupons, search])

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.is_active && !isExpired(c))
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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Coupons
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Create and manage discount coupons across partner companies.
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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coupons</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <TicketIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalCoupons}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Coupons</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <SparklesIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.activeCoupons}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Companies</span>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <BuildingIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalCompanies}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Redemptions</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <TicketIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-600">{stats.totalRedemptions}</h3>
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
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Coupons</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredCoupons.length} coupon{filteredCoupons.length === 1 ? '' : 's'} · new coupons slot straight into this table
              </p>
            </div>
            <div className="relative sm:w-72">
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

          {filteredCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <TicketIcon size={28} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No coupons yet</p>
              <p className="mt-1 text-xs text-slate-500 mb-4">Add your first coupon to get started.</p>
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
                    <th className="py-3.5 px-6">Coupon</th>
                    <th className="py-3.5 px-6">Company</th>
                    <th className="py-3.5 px-6">Code</th>
                    <th className="py-3.5 px-6">Discount</th>
                    <th className="py-3.5 px-6">Used</th>
                    <th className="py-3.5 px-6">Expires</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredCoupons.map((coupon) => {
                    const status = statusInfo(coupon)
                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                              {coupon.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={coupon.image_url} alt={coupon.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon size={16} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{coupon.title}</p>
                              {coupon.description && (
                                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">{coupon.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                            <BuildingIcon size={12} className="text-slate-400" />
                            {coupon.company_name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {coupon.code ? (
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">
                              {coupon.code}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-mono font-bold text-slate-900">{discountLabel(coupon)}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1857D6]">
                            {coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <CalendarClockIcon size={12} className="text-slate-400" />
                            {coupon.expires_at ? formatDate(coupon.expires_at) : 'Never'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.classes}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setCouponPendingEdit(coupon)}
                              title="Edit coupon"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#1857D6] transition-all cursor-pointer"
                            >
                              <PencilIcon size={14} />
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
        nextSortOrder={nextSortOrder}
      />

      <EditCouponModal
        coupon={couponPendingEdit}
        onClose={() => setCouponPendingEdit(null)}
        onUpdated={fetchData}
      />

      <DeleteCouponModal
        coupon={couponPendingDelete}
        onClose={() => setCouponPendingDelete(null)}
        onDeleted={fetchData}
      />
    </div>
  )
}