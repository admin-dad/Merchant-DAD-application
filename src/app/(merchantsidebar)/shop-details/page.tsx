'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Store,
  MapPin,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Tag,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string
  business_name: string
  address: string
  category: string
  sub_category: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

const CATEGORIES_WITH_SUB = {
  'Kirana Store': [
    'General Provisions',
    'Packaged Foods',
    'Dairy & Eggs',
    'Beverages',
    'Household Essentials',
  ],
  'Grocery Store': [
    'Fresh Produce',
    'Staples & Grains',
    'Snacks & Confectionery',
    'Personal Care',
    'Cleaning Supplies',
  ],
  'Supermarket': [
    'Bakery & Dairy',
    'Frozen Foods',
    'Gourmet & Organic',
    'Home & Kitchen',
    'Baby Care',
  ],
  'Fashion & Clothing': [
    "Men's Wear",
    "Women's Wear",
    'Kids Wear',
    'Footwear',
    'Accessories',
  ],
  'Electronics': [
    'Mobile & Accessories',
    'Home Appliances',
    'Audio & Video',
    'Computer & IT',
    'Gaming',
  ],
  'Mobile Shop': [
    'Smartphones',
    'Mobile Accessories',
    'Repairs & Services',
    'Prepaid Recharges',
  ],
  'Restaurant': [
    'Fast Food',
    'Fine Dining',
    'Bakery & Confectionery',
    'North Indian',
    'South Indian',
  ],
  'Cafe': [
    'Coffee & Tea',
    'Bakery & Snacks',
    'Desserts',
    'Juices & Smoothies',
  ],
  'Salon': [
    'Hair Care',
    'Skin Care',
    'Bridal Services',
    'Spa & Massage',
  ],
  'Medical Store': [
    'Allopathic Medicines',
    'Ayurvedic & Herbal',
    'Surgical & Healthcare',
    'Baby & Mother Care',
  ],
  'Hardware Shop': [
    'Tools & Equipment',
    'Plumbing',
    'Electricals',
    'Paints & Finishes',
  ],
  'Furniture Store': [
    'Living Room',
    'Bedroom',
    'Office Furniture',
    'Home Decor',
  ],
  'Jewellery Store': [
    'Gold & Diamond',
    'Silver Jewellery',
    'Artificial Jewellery',
    'Gemstones',
  ],
  'Service Provider': [
    'IT Services',
    'Repair & Maintenance',
    'Cleaning Services',
    'Consulting',
  ],
  'Other': [
    'General',
    'Miscellaneous',
  ],
}

const BUSINESS_CATEGORIES = Object.keys(CATEGORIES_WITH_SUB)

const statusStyles: Record<MerchantRow['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

type EditableField = 'address' | 'category' | 'sub_category'
type FormErrors = Partial<Record<EditableField, string>>

export default function ShopDetailsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantRow | null>(null)
  
  // business_name and status are locked/read-only. Only address, category, and sub_category are editable.
  const [form, setForm] = useState<Pick<MerchantRow, EditableField>>({
    address: '',
    category: '',
    sub_category: '',
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('merchants')
        .select('id, business_name, address, category, sub_category, status')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (!error && data) {
        setMerchant(data as MerchantRow)
        setForm({
          address: data.address || '',
          category: data.category || '',
          sub_category: data.sub_category || '',
        })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const update = (field: EditableField, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'category') {
        updated.sub_category = ''
      }
      return updated
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (saveMessage) setSaveMessage(null)
  }

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!form.address.trim()) next.address = 'Address is required'
    if (!form.category) next.category = 'Select a category'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant) return
    if (!validate()) return

    setSaving(true)
    setSaveMessage(null)

    const { error } = await supabase
      .from('merchants')
      .update({
        address: form.address.trim(),
        category: form.category,
        sub_category: form.sub_category.trim() || null,
      })
      .eq('id', merchant.id)

    setSaving(false)

    if (error) {
      setSaveMessage({ type: 'error', text: error.message || 'Could not save your changes.' })
      return
    }

    setSaveMessage({ type: 'success', text: 'Shop details updated successfully.' })
    setMerchant((prev) => (prev ? { ...prev, ...form } : prev))
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center bg-white" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t find your shop details</h2>
        <p className="mt-2 text-sm text-slate-500">
          Please contact support if this keeps happening.
        </p>
      </div>
    )
  }

  const currentSubCategories = form.category ? CATEGORIES_WITH_SUB[form.category as keyof typeof CATEGORIES_WITH_SUB] || [] : []

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Store size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {merchant.business_name || 'Business / Shop Details'}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[merchant.status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {merchant.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage your shop category, sub-category, and operational address. Shop Name and Status are read-only.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Details Form */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSave}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Shop Profile Configuration</h2>
            <p className="text-xs text-slate-500">Review locked parameters and update your store info below.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Shop Name & Status Combined Row (Both Locked) */}
          <div className="sm:col-span-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Shop Name (Locked - takes 2 cols on desktop) */}
            <div className="sm:col-span-2">
              <Field label="Shop Name" icon={<Store size={16} />} badge="Locked">
                <div className="relative">
                  <input
                    type="text"
                    value={merchant.business_name}
                    disabled
                    className={`${inputClass(false)} cursor-not-allowed bg-slate-100/70 text-slate-600 font-medium pr-10`}
                  />
                  <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
            </div>

            {/* Status (Locked - takes 1 col on desktop) */}
            <div className="sm:col-span-1">
              <Field label="Status" icon={<ShieldCheck size={16} />} badge="Locked">
                <div className="relative">
                  <input
                    type="text"
                    value={merchant.status.toUpperCase()}
                    disabled
                    className={`${inputClass(false)} cursor-not-allowed bg-slate-100/70 text-slate-600 font-medium pr-10`}
                  />
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded uppercase ${statusStyles[merchant.status]}`}>
                    {merchant.status}
                  </span>
                </div>
              </Field>
            </div>
          </div>

          {/* Category Dropdown */}
          <Field label="Category" icon={<ChevronDown size={16} />} error={errors.category}>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className={`${inputClass(!!errors.category)} appearance-none cursor-pointer pr-10`}
              >
                <option value="">Select a category</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          {/* Sub-Category Dropdown */}
          <Field label="Sub-Category" icon={<Tag size={16} />} error={errors.sub_category}>
            <div className="relative">
              <select
                value={form.sub_category || ''}
                onChange={(e) => update('sub_category', e.target.value)}
                disabled={!form.category}
                className={`${inputClass(false)} appearance-none cursor-pointer pr-10 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
              >
                <option value="">{form.category ? 'Select a sub-category' : 'Select category first'}</option>
                {currentSubCategories.map((subCat) => (
                  <option key={subCat} value={subCat}>
                    {subCat}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          {/* Address */}
          <div className="sm:col-span-2">
            <Field label="Address" icon={<MapPin size={16} />} error={errors.address}>
              <textarea
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                rows={3}
                placeholder="Enter complete shop address..."
                className={`${inputClass(!!errors.address)} resize-none`}
              />
            </Field>
          </div>
        </div>

        {saveMessage && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              saveMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared field wrapper
// ─────────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon,
  error,
  badge,
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className="text-[#1857D6]">{icon}</span>
          {label}
        </label>
        {badge && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 tracking-wide uppercase">
            {badge}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm text-slate-800',
    'placeholder:text-slate-400 transition-all duration-200',
    'focus:bg-white focus:outline-none focus:ring-2',
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-slate-200 focus:border-[#1857D6] focus:ring-[#1857D6]/10',
  ].join(' ')
}