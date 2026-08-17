'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types — mirrors the "merchants" table
// ─────────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string
  business_name: string
  owner_name: string
  mobile: string
  email: string | null
  category: string
  sub_category: string | null
  address: string
  gst: string | null
  pan: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

const BUSINESS_CATEGORIES = [
  'Kirana Store',
  'Grocery Store',
  'Supermarket',
  'Fashion & Clothing',
  'Electronics',
  'Mobile Shop',
  'Restaurant',
  'Cafe',
  'Salon',
  'Medical Store',
  'Hardware Shop',
  'Furniture Store',
  'Jewellery Store',
  'Service Provider',
  'Other',
]

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
  | 'category'
  | 'sub_category'
  | 'address'
  | 'gst'
  | 'pan'
type FormErrors = Partial<Record<EditableField, string>>

export default function ProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantRow | null>(null)
  const [form, setForm] = useState<Pick<MerchantRow, EditableField>>({
    business_name: '',
    owner_name: '',
    mobile: '',
    category: '',
    sub_category: '',
    address: '',
    gst: '',
    pan: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

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
        .select('id, business_name, owner_name, mobile, email, category, sub_category, address, gst, pan, status')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (!error && data) {
        setMerchant(data as MerchantRow)
        setForm({
          business_name: data.business_name || '',
          owner_name: data.owner_name || '',
          mobile: data.mobile || '',
          category: data.category || '',
          sub_category: data.sub_category || '',
          address: data.address || '',
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

  const update = (field: EditableField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (saveMessage) setSaveMessage(null)
  }

  // Only address is editable now, so only address needs validation.
  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!form.address.trim()) next.address = 'Business address is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant) return
    if (!validate()) return

    setSaving(true)
    setSaveMessage(null)

    // Only the address field is user-editable; everything else is locked.
    const { error } = await supabase
      .from('merchants')
      .update({
        address: form.address.trim(),
      })
      .eq('id', merchant.id)

    setSaving(false)

    if (error) {
      setSaveMessage({ type: 'error', text: error.message || 'Could not save your changes.' })
      return
    }

    setSaveMessage({ type: 'success', text: 'Profile updated successfully.' })
    setMerchant((prev) => (prev ? { ...prev, address: form.address } : prev))
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
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage your storefront configuration and security credentials.
              </p>
            </div>
          </div>
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

      {/* Side-by-Side Grid for Business Details & Account Security */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Business Details Form (Takes 7 columns on large screens) */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSave}
          className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div>
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Business & Shop Information</h2>
                <p className="text-xs text-slate-500">Only your business address can be updated here. Other details are locked — contact support to change them.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Business Name" icon={<Store size={16} />} error={errors.business_name}>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => update('business_name', e.target.value)}
                  placeholder="Enter store name"
                  disabled
                  className={`${inputClass(!!errors.business_name)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <Field label="Owner Name" icon={<User size={16} />} error={errors.owner_name}>
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={(e) => update('owner_name', e.target.value)}
                  placeholder="Enter full owner name"
                  disabled
                  className={`${inputClass(!!errors.owner_name)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
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
                  disabled
                  className={`${inputClass(!!errors.mobile)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <Field label="Email Address" icon={<Mail size={16} />}>
                <input
                  type="email"
                  value={merchant.email || ''}
                  disabled
                  className={`${inputClass(false)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <Field label="Business Category" icon={<ChevronDown size={16} />} error={errors.category}>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                    disabled
                    className={`${inputClass(!!errors.category)} appearance-none cursor-not-allowed bg-slate-100/60 text-slate-500 pr-10`}
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

              <Field label="Sub Category" icon={<Tag size={16} />} error={errors.sub_category}>
                <input
                  type="text"
                  value={form.sub_category || ''}
                  onChange={(e) => update('sub_category', e.target.value)}
                  placeholder="Sub category"
                  disabled
                  className={`${inputClass(!!errors.sub_category)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <Field label="GST Number (Optional)" icon={<FileText size={16} />}>
                <input
                  type="text"
                  value={form.gst || ''}
                  onChange={(e) => update('gst', e.target.value.toUpperCase())}
                  maxLength={15}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  disabled
                  className={`${inputClass(false)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <Field label="PAN Number" icon={<CreditCard size={16} />}>
                <input
                  type="text"
                  value={form.pan || ''}
                  onChange={(e) => update('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="e.g. AAAAA0000A"
                  disabled
                  className={`${inputClass(false)} cursor-not-allowed bg-slate-100/60 text-slate-500`}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Business Address" icon={<MapPin size={16} />} error={errors.address}>
                  <textarea
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    rows={3}
                    placeholder="Enter complete store address..."
                    className={`${inputClass(!!errors.address)} resize-none`}
                  />
                </Field>
              </div>
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

        {/* Change Password Form (Takes 5 columns on large screens) */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onSubmit={handlePasswordChange}
          className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div>
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Account Security</h2>
                <p className="text-xs text-slate-500">Update your account password securely.</p>
              </div>
            </div>

            <div className="space-y-5">
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
            </div>

            {passwordError && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span>Password updated successfully.</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={passwordSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {passwordSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </motion.form>
      </div>
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