'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import MerchantScratchCard from '@/components/MerchantScratchCard'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Store,
  User,
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Home,
  Landmark,
  Map,
  Globe2,
  Hash,
  FileText,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2,
  Wallet,
  Building2,
  ShieldCheck,
  Tag,
  CreditCard,
  X,
  KeyRound,
  IndianRupee,
  ScanLine,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types — mirrors the "merchants" table (after the ALTER TABLE below)
// ─────────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string
  business_name: string
  owner_name: string
  mobile: string
  alternate_mobile: string | null
  email: string | null
  category: string | null
  sub_category: string | null
  address: string | null
  house_floor: string | null
  landmark: string | null
  district: string | null
  state: string | null
  country: string | null
  pincode: string | null
  gst: string | null
  pan: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  subscription_plan_id: string | null
  plan_name: string | null
}

interface CategoryRow {
  id: string
  name: string
  sort_order: number
}

interface SubcategoryRow {
  id: string
  category_id: string
  name: string
  scan_amount: number
  sort_order: number
}

const statusStyles: Record<MerchantRow['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

type EditableField =
  | 'business_name'
  | 'owner_name'
  | 'mobile'
  | 'alternate_mobile'
  | 'email'
  | 'category'
  | 'sub_category'
  | 'house_floor'
  | 'landmark'
  | 'district'
  | 'state'
  | 'country'
  | 'pincode'
  | 'gst'
  | 'pan'

type FormErrors = Partial<Record<EditableField, string>>

const EMPTY_FORM: Record<EditableField, string> = {
  business_name: '',
  owner_name: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  category: '',
  sub_category: '',
  house_floor: '',
  landmark: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
  gst: '',
  pan: '',
}

export default function ProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantRow | null>(null)
  const [form, setForm] = useState<Record<EditableField, string>>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Categories / Subcategories (fetched from the DB)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([])
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)

  // Password change popup state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // ── Load merchant profile ────────────────────────────────────────────
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
        .select(
          'id, business_name, owner_name, mobile, alternate_mobile, email, category, sub_category, address, house_floor, landmark, district, state, country, pincode, gst, pan, status, subscription_plan_id, subscription_plans ( name )'
        )
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (!error && data) {
        const planJoin = Array.isArray(data.subscription_plans)
          ? data.subscription_plans[0]
          : data.subscription_plans
        setMerchant({
          ...(data as unknown as MerchantRow),
          plan_name: planJoin?.name ?? null,
        })
        setForm({
          business_name: data.business_name || '',
          owner_name: data.owner_name || '',
          mobile: data.mobile || '',
          alternate_mobile: data.alternate_mobile || '',
          email: data.email || '',
          category: data.category || '',
          sub_category: data.sub_category || '',
          house_floor: data.house_floor || '',
          landmark: data.landmark || '',
          district: data.district || '',
          state: data.state || '',
          country: data.country || 'India',
          pincode: data.pincode || '',
          gst: data.gst || '',
          pan: data.pan || '',
        })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // ── Load active categories ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setCategoriesLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (cancelled) return

      if (!error && data) {
        setCategories(data as CategoryRow[])
      }
      setCategoriesLoading(false)
    }

    loadCategories()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // ── Load subcategories whenever the selected category changes ───────
  const loadSubcategoriesForCategory = useCallback(
    async (categoryId: string) => {
      if (!categoryId) {
        setSubcategories([])
        return
      }
      setSubcategoriesLoading(true)
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, category_id, name, scan_amount, sort_order')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (!error && data) {
        setSubcategories(data as SubcategoryRow[])
      } else {
        setSubcategories([])
      }
      setSubcategoriesLoading(false)
    },
    [supabase]
  )

  // Once both the merchant profile and the category list are loaded, resolve
  // the merchant's saved category name -> id, then fetch its subcategories
  // so the existing sub_category value shows up correctly in the dropdown.
// Load subcategories for the merchant's saved category
useEffect(() => {
  if (categoriesLoading || !form.category) return

  const savedCategory = form.category.trim().toLowerCase()

  const matched = categories.find(
    (c) => c.name.trim().toLowerCase() === savedCategory
  )

  if (matched) {
    loadSubcategoriesForCategory(matched.id)
  } else {
    console.warn('Category not found:', form.category)
    console.warn(
      'Available categories:',
      categories.map((c) => c.name)
    )
    setSubcategories([])
  }
}, [categoriesLoading, categories, form.category, loadSubcategoriesForCategory])

  // ── Close the password modal on Escape ───────────────────────────────
  useEffect(() => {
    if (!showPasswordModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePasswordModal()
    }
    window.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPasswordModal])

  // ── The currently selected sub category's per-scan amount ───────────
  const selectedSubcategory = useMemo(
    () => subcategories.find((s) => s.name === form.sub_category) || null,
    [subcategories, form.sub_category]
  )

  const update = (field: EditableField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (saveMessage) setSaveMessage(null)
  }

  const handleCategoryChange = (categoryName: string) => {
    setForm((prev) => ({ ...prev, category: categoryName, sub_category: '' }))
    if (errors.category || errors.sub_category) {
      setErrors((prev) => ({ ...prev, category: undefined, sub_category: undefined }))
    }
    if (saveMessage) setSaveMessage(null)

    const matched = categories.find((c) => c.name === categoryName)
    if (matched) {
      loadSubcategoriesForCategory(matched.id)
    } else {
      setSubcategories([])
    }
  }

  const validate = (): boolean => {
    const next: FormErrors = {}

    if (!form.business_name.trim()) next.business_name = 'Business name is required'
    if (!form.owner_name.trim()) next.owner_name = 'Owner name is required'

    if (!form.mobile.trim()) {
      next.mobile = 'Mobile number is required'
    } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      next.mobile = 'Enter a valid 10-digit mobile number'
    }

    if (form.alternate_mobile.trim() && !/^[6-9]\d{9}$/.test(form.alternate_mobile.trim())) {
      next.alternate_mobile = 'Enter a valid 10-digit mobile number'
    }

    if (!form.email.trim()) {
      next.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address'
    }

    if (!form.category) next.category = 'Select a business category'
    if (!form.sub_category) next.sub_category = 'Select a sub category'

    if (!form.house_floor.trim()) next.house_floor = 'House / floor number is required'
    if (!form.district.trim()) next.district = 'District is required'
    if (!form.state.trim()) next.state = 'State is required'
    if (!form.country.trim()) next.country = 'Country is required'

    if (!form.pincode.trim()) {
      next.pincode = 'Pincode is required'
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      next.pincode = 'Enter a valid 6-digit pincode'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant) return
    if (!validate()) return

    setSaving(true)
    setSaveMessage(null)

    // Build a single human-readable address string from the structured
    // parts so anywhere else in the app that still reads "address" keeps
    // working, while the structured fields stay queryable on their own.
    const combinedAddress = [
      form.house_floor.trim(),
      form.landmark.trim(),
      form.district.trim(),
      form.state.trim(),
      form.country.trim(),
      form.pincode.trim(),
    ]
      .filter(Boolean)
      .join(', ')

    const { error } = await supabase
      .from('merchants')
      .update({
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim(),
        mobile: form.mobile.trim(),
        alternate_mobile: form.alternate_mobile.trim() || null,
        email: form.email.trim(),
        category: form.category,
        sub_category: form.sub_category,
        house_floor: form.house_floor.trim(),
        landmark: form.landmark.trim() || null,
        district: form.district.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        pincode: form.pincode.trim(),
        address: combinedAddress,
        gst: form.gst.trim() || null,
        pan: form.pan.trim() || null,
      })
      .eq('id', merchant.id)

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        setSaveMessage({ type: 'error', text: 'That mobile number is already registered to another account.' })
      } else {
        setSaveMessage({ type: 'error', text: error.message || 'Could not save your changes.' })
      }
      return
    }

    setSaveMessage({ type: 'success', text: 'Profile updated successfully.' })
    setMerchant((prev) =>
      prev
        ? {
            ...prev,
            business_name: form.business_name,
            owner_name: form.owner_name,
            mobile: form.mobile,
            alternate_mobile: form.alternate_mobile,
            email: form.email,
            category: form.category,
            sub_category: form.sub_category,
            house_floor: form.house_floor,
            landmark: form.landmark,
            district: form.district,
            state: form.state,
            country: form.country,
            pincode: form.pincode,
            address: combinedAddress,
            gst: form.gst,
            pan: form.pan,
          }
        : prev
    )
  }

  // ── Password modal helpers ───────────────────────────────────────────
  const openPasswordModal = () => {
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(false)
    setShowPassword(false)
    setShowPasswordModal(true)
  }

  const closePasswordModal = () => {
    if (passwordSaving) return
    setShowPasswordModal(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmPassword('')

    // Auto-close the popup shortly after a successful update
    setTimeout(() => {
      setShowPasswordModal(false)
    }, 1500)
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t find your merchant profile</h2>
        <p className="mt-2 text-sm text-slate-500">
          Please contact support if this keeps happening.
        </p>
      </div>
    )
  }

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
                  {merchant.business_name || 'My Profile'}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[merchant.status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {merchant.status}
                </span>
                {merchant.plan_name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1857D6]">
                    <CreditCard size={12} />
                    {merchant.plan_name} Plan
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage your storefront configuration and security credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openPasswordModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            <ShieldCheck size={16} className="text-[#1857D6]" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* Referral Code & Wallet Points Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/referrals"
          className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
            <Share2 size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Referral Code</p>
            <p className="text-xs font-medium text-slate-400">View your referrals and rewards history</p>
          </div>
        </Link>

        <Link
          href="/rewards-wallet"
          className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md cursor-pointer"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C] transition-transform group-hover:scale-105">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Wallet Points</p>
            <p className="text-xs font-medium text-slate-400">Check balance and redeem points</p>
          </div>
        </Link>
      </div>

      {/* Business Details Form — full-width row */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSave}
        className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Business & Shop Information</h2>
              <p className="text-xs text-slate-500">Keep your details accurate — this is what customers and our team see.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Business Name" icon={<Store size={16} />} error={errors.business_name}>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                placeholder="Enter store name"
                className={inputClass(!!errors.business_name)}
              />
            </Field>

            <Field label="Owner Name" icon={<User size={16} />} error={errors.owner_name}>
              <input
                type="text"
                value={form.owner_name}
                onChange={(e) => update('owner_name', e.target.value)}
                placeholder="Enter full owner name"
                className={inputClass(!!errors.owner_name)}
              />
            </Field>

            <Field label="Mobile Number" icon={<Phone size={16} />} error={errors.mobile}>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className={inputClass(!!errors.mobile)}
              />
            </Field>

            <Field label="Alternate Number (Optional)" icon={<PhoneCall size={16} />} error={errors.alternate_mobile}>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.alternate_mobile}
                onChange={(e) => update('alternate_mobile', e.target.value.replace(/\D/g, ''))}
                placeholder="Alternate 10-digit number"
                className={inputClass(!!errors.alternate_mobile)}
              />
            </Field>

            <Field label="Email Address" icon={<Mail size={16} />} error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@business.com"
                className={inputClass(!!errors.email)}
              />
            </Field>

            <Field label="Business Category" icon={<ChevronDown size={16} />} error={errors.category}>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={categoriesLoading}
                  className={`${inputClass(!!errors.category)} appearance-none pr-10 disabled:opacity-60`}
                >
                  <option value="">
                    {categoriesLoading ? 'Loading categories…' : 'Select a category'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categoriesLoading ? (
                  <Loader2
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400 pointer-events-none"
                  />
                ) : (
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>
            </Field>

            <div>
              <Field label="Sub Category" icon={<Tag size={16} />} error={errors.sub_category}>
                <div className="relative">
                  <select
                    value={form.sub_category}
                    onChange={(e) => update('sub_category', e.target.value)}
                    disabled={!form.category || subcategoriesLoading}
                    className={`${inputClass(!!errors.sub_category)} appearance-none pr-10 disabled:opacity-60`}
                  >
                    <option value="">
                      {!form.category
                        ? 'Select a category first'
                        : subcategoriesLoading
                        ? 'Loading sub categories…'
                        : subcategories.length === 0
                        ? 'No sub categories available'
                        : 'Select a sub category'}
                    </option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  {subcategoriesLoading ? (
                    <Loader2
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400 pointer-events-none"
                    />
                  ) : (
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </Field>

              {/* Per-scan amount for the selected sub category */}
              <AnimatePresence>
                {selectedSubcategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#1857D6] shadow-sm">
                        <ScanLine size={14} />
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        Customers pay{' '}
                        <span className="inline-flex items-center font-bold text-[#1857D6]">
                          <IndianRupee size={11} className="mr-0.5" />
                          {Number(selectedSubcategory.scan_amount).toFixed(2)}
                        </span>{' '}
                        per QR scan for this sub category.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Field label="House No. & Floor No." icon={<Home size={16} />} error={errors.house_floor}>
              <input
                type="text"
                value={form.house_floor}
                onChange={(e) => update('house_floor', e.target.value)}
                placeholder="e.g. Shop No. 4, 1st Floor"
                className={inputClass(!!errors.house_floor)}
              />
            </Field>

            <Field label="Landmark (Optional)" icon={<Landmark size={16} />} error={errors.landmark}>
              <input
                type="text"
                value={form.landmark}
                onChange={(e) => update('landmark', e.target.value)}
                placeholder="e.g. Near City Hospital"
                className={inputClass(!!errors.landmark)}
              />
            </Field>

            <Field label="District" icon={<Map size={16} />} error={errors.district}>
              <input
                type="text"
                value={form.district}
                onChange={(e) => update('district', e.target.value)}
                placeholder="e.g. Bengaluru Urban"
                className={inputClass(!!errors.district)}
              />
            </Field>

            <Field label="State" icon={<MapPin size={16} />} error={errors.state}>
              <input
                type="text"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                placeholder="e.g. Karnataka"
                className={inputClass(!!errors.state)}
              />
            </Field>

            <Field label="Country" icon={<Globe2 size={16} />} error={errors.country}>
              <input
                type="text"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                placeholder="e.g. India"
                className={inputClass(!!errors.country)}
              />
            </Field>

            <Field label="Pincode" icon={<Hash size={16} />} error={errors.pincode}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => update('pincode', e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit pincode"
                className={inputClass(!!errors.pincode)}
              />
            </Field>

            <Field label="GST Number (Optional)" icon={<FileText size={16} />}>
              <input
                type="text"
                value={form.gst}
                onChange={(e) => update('gst', e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="e.g. 22AAAAA0000A1Z5"
                className={inputClass(false)}
              />
            </Field>

            <Field label="PAN Number (Optional)" icon={<CreditCard size={16} />}>
              <input
                type="text"
                value={form.pan}
                onChange={(e) => update('pan', e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="e.g. AAAAA0000A"
                className={inputClass(false)}
              />
            </Field>
          </div>

          {saveMessage && (
            <div
              className={`mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${saveMessage.type === 'success'
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
        </div>

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

      {/* ── Change Password Popup ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closePasswordModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-password-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8"
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePasswordModal}
                aria-label="Close"
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 pr-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 id="change-password-title" className="text-base font-semibold text-slate-900">
                    Change Password
                  </h2>
                  <p className="text-xs text-slate-500">Update your account password securely.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <Field label="New Password" icon={<Lock size={16} />}>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (passwordError) setPasswordError(null)
                      }}
                      placeholder="At least 8 characters"
                      autoFocus
                      className={`${inputClass(false)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm New Password" icon={<Lock size={16} />}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (passwordError) setPasswordError(null)
                    }}
                    placeholder="Re-enter new password"
                    className={inputClass(false)}
                  />
                </Field>

                {passwordError && (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    <AlertCircle size={18} className="shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    <span>Password updated successfully.</span>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

            {/* Render B2B Scratch Card if exists */}
            {merchant && <MerchantScratchCard merchantId={merchant.id} />}
      
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
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-[#1857D6]">{icon}</span>
        {label}
      </label>
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