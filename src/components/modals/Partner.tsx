'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ChevronDown,
  CheckCircle2,
  MailCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  ArrowRight,
  Loader2,
  Package,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
// NOTE: "Partner" here maps to the Vendor / Seller role defined in the SOW
// (Section 19 — Vendor / Seller Management) and the Platform Portals doc
// (Portal 4 — Vendor / Seller Portal: Registration, Profile, Product
// Management, Inventory, Pricing, Orders, Commission, Settlement, Reports).
// It is intentionally a separate table/flow from Merchant Partners.

interface PartnerModalProps {
  isOpen: boolean
  initialMode?: 'login' | 'register'
  onClose: () => void
}

type Mode = 'login' | 'register'

interface FormState {
  storeName: string
  ownerName: string
  mobile: string
  email: string
  password: string
  confirmPassword: string
  businessType: string
  category: string
  address: string
  gst: string
  pan: string
}

const INITIAL_FORM: FormState = {
  storeName: '',
  ownerName: '',
  mobile: '',
  email: '',
  password: '',
  confirmPassword: '',
  businessType: '',
  category: '',
  address: '',
  gst: '',
  pan: '',
}

// Type of seller — drives how Product Management / Inventory / Commission
// behave in the Vendor Portal.
const BUSINESS_TYPES = [
  'Manufacturer',
  'Wholesaler / Distributor',
  'Retailer',
  'Individual Seller',
  'Service Provider',
]

// Primary category of products the vendor intends to list — feeds Product
// & Category Management on the Super Admin side.
const PRODUCT_CATEGORIES = [
  'Grocery & FMCG',
  'Fashion & Apparel',
  'Electronics & Gadgets',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Furniture',
  'Jewellery & Accessories',
  'Books & Stationery',
  'Sports & Fitness',
  'Toys & Baby Products',
  'Automotive',
  'Other',
]

type FormErrors = Partial<Record<keyof FormState, string>>

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function PartnerModal({ isOpen, initialMode = 'register', onClose }: PartnerModalProps) {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) setMode(initialMode)
  }, [isOpen, initialMode])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const resetAndClose = () => {
    onClose()
    setTimeout(() => {
      setForm(INITIAL_FORM)
      setErrors({})
      setAgreed(false)
      setSubmitted(false)
      setNeedsEmailConfirm(false)
      setServerError(null)
      setShowPassword(false)
      setShowConfirm(false)
    }, 300)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setErrors({})
    setServerError(null)
  }

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (serverError) setServerError(null)
  }

  const validate = (): boolean => {
    const next: FormErrors = {}

    if (mode === 'register') {
      if (!form.storeName.trim()) next.storeName = 'Store / business name is required'
      if (!form.ownerName.trim()) next.ownerName = 'Owner / contact name is required'

      if (!form.mobile.trim()) {
        next.mobile = 'Mobile number is required'
      } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
        next.mobile = 'Enter a valid 10-digit mobile number'
      }

      if (!form.businessType) next.businessType = 'Select a seller type'
      if (!form.category) next.category = 'Select a product category'
      if (!form.address.trim()) next.address = 'Business address is required'
    }

    if (!form.email.trim()) {
      next.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address'
    }

    if (!form.password) {
      next.password = 'Password is required'
    } else if (mode === 'register' && form.password.length < 8) {
      next.password = 'Use at least 8 characters'
    }

    if (mode === 'register' && form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (mode === 'register' && !agreed) {
      setServerError('Please accept the Vendor Agreement to continue.')
      return
    }
    if (!validate()) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })

        if (error) {
          setServerError(
            error.message === 'Invalid login credentials'
              ? 'Incorrect email or password.'
              : error.message
          )
          return
        }

        resetAndClose()
        router.push('/vdashboard')
        router.refresh()
        return
      }

      // ── mode === 'register' ─────────────────────────────────────────
      // All vendor fields go into signUp metadata — a DB trigger reads
      // this metadata and creates the "vendors" row itself (running with
      // elevated privileges), so it works even before email confirmation,
      // mirroring the merchant onboarding trigger pattern.
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            role: 'vendor',
            store_name: form.storeName.trim(),
            owner_name: form.ownerName.trim(),
            mobile: form.mobile.trim(),
            business_type: form.businessType,
            category: form.category,
            address: form.address.trim(),
            gst: form.gst.trim() || null,
            pan: form.pan.trim() || null,
          },
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered')) {
          setServerError('An account already exists for this email. Try logging in instead.')
        } else if (msg.includes('mobile_already_registered')) {
          setErrors((prev) => ({ ...prev, mobile: 'This mobile number is already registered.' }))
        } else if (msg.includes('database error saving new user')) {
          setErrors((prev) => ({
            ...prev,
            mobile: 'This mobile number may already be registered. Please check and try again.',
          }))
        } else {
          setServerError(error.message)
        }
        return
      }

      if (!data.user) {
        setServerError('Something went wrong creating your account. Please try again.')
        return
      }

      if (!data.session) {
        // Email confirmation required — the DB trigger creates the
        // "vendors" row server-side since there's no session yet.
        setNeedsEmailConfirm(true)
        return
      }

      // Active session (email confirmation off) — insert directly, upsert
      // on user_id so this is safe even if the trigger already ran.
      const { error: profileError } = await supabase.from('vendors').upsert(
        {
          user_id: data.user.id,
          store_name: form.storeName.trim(),
          owner_name: form.ownerName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim(),
          business_type: form.businessType,
          category: form.category,
          address: form.address.trim(),
          gst: form.gst.trim() || null,
          pan: form.pan.trim() || null,
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )

      if (profileError) {
        if (profileError.code === '23505') {
          setErrors((prev) => ({
            ...prev,
            mobile: 'This mobile number is already registered.',
          }))
        } else {
          setServerError(profileError.message || 'Could not save your vendor details.')
        }
        return
      }

      setSubmitted(true)
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to reach the server. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const showResult = submitted || needsEmailConfirm

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
          />

          {/* Modal card — light mode, same shell as the Merchant modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-modal-title"
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />

            <button
              onClick={resetAndClose}
              aria-label="Close"
              className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              {!showResult ? (
                <>
                  {/* Header */}
                  <div className="mb-5 pr-8">
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7BC142]/10 to-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#3E7A1C]">
                      <Package size={13} />
                      <span>Vendor / Seller Partner {mode === 'register' ? 'Registration' : 'Login'}</span>
                    </div>
                    <h2
                      id="partner-modal-title"
                      className="text-2xl font-semibold text-[#0B0F19] sm:text-[28px]"
                    >
                      {mode === 'register' ? 'Become a Selling Partner' : 'Welcome back'}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                      {mode === 'register'
                        ? 'Register as a Vendor / Seller Partner to list products, manage inventory and track your orders, commission and settlements.'
                        : 'Log in to access your Vendor / Seller Dashboard.'}
                    </p>
                  </div>

                  {/* Mode switcher */}
                  <div className="relative mb-6 flex rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className={`relative z-10 flex-1 rounded-xl py-2 text-sm font-medium transition-colors cursor-pointer ${
                        mode === 'register' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`relative z-10 flex-1 rounded-xl py-2 text-sm font-medium transition-colors cursor-pointer ${
                        mode === 'login' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Login
                    </button>
                    <motion.div
                      className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] shadow-sm"
                      animate={{ left: mode === 'register' ? '6px' : 'calc(50% + 0px)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <AnimatePresence mode="wait">
                      {mode === 'register' && (
                        <motion.div
                          key="register-fields"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          {/* Store Name */}
                          <Field label="Store / Business Name" icon={<Store size={16} />} error={errors.storeName}>
                            <input
                              type="text"
                              value={form.storeName}
                              onChange={(e) => update('storeName', e.target.value)}
                              placeholder="e.g. Sharma Traders"
                              className={inputClass(!!errors.storeName)}
                            />
                          </Field>

                          {/* Owner Name */}
                          <Field label="Owner / Contact Name" icon={<User size={16} />} error={errors.ownerName}>
                            <input
                              type="text"
                              value={form.ownerName}
                              onChange={(e) => update('ownerName', e.target.value)}
                              placeholder="Full name"
                              className={inputClass(!!errors.ownerName)}
                            />
                          </Field>

                          {/* Mobile */}
                          <Field label="Mobile Number" icon={<Phone size={16} />} error={errors.mobile}>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={form.mobile}
                              onChange={(e) => update('mobile', e.target.value.replace(/\D/g, ''))}
                              placeholder="10-digit number"
                              className={inputClass(!!errors.mobile)}
                            />
                          </Field>

                          {/* Seller Type */}
                          <Field label="Seller Type" icon={<ChevronDown size={16} />} error={errors.businessType}>
                            <select
                              value={form.businessType}
                              onChange={(e) => update('businessType', e.target.value)}
                              className={`${inputClass(!!errors.businessType)} appearance-none cursor-pointer`}
                            >
                              <option value="">Select seller type</option>
                              {BUSINESS_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </Field>

                          {/* Product Category */}
                          <Field label="Primary Product Category" icon={<Package size={16} />} error={errors.category}>
                            <select
                              value={form.category}
                              onChange={(e) => update('category', e.target.value)}
                              className={`${inputClass(!!errors.category)} appearance-none cursor-pointer`}
                            >
                              <option value="">Select a category</option>
                              {PRODUCT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </Field>

                          {/* Address */}
                          <Field label="Business Address" icon={<MapPin size={16} />} error={errors.address}>
                            <textarea
                              value={form.address}
                              onChange={(e) => update('address', e.target.value)}
                              placeholder="Warehouse / shop / office address, city, state, PIN code"
                              rows={2}
                              className={`${inputClass(!!errors.address)} resize-none`}
                            />
                          </Field>

                          {/* GST */}
                          <Field label="GST Number (if applicable)" icon={<FileText size={16} />}>
                            <input
                              type="text"
                              value={form.gst}
                              onChange={(e) => update('gst', e.target.value.toUpperCase())}
                              placeholder="22AAAAA0000A1Z5"
                              maxLength={15}
                              className={inputClass(false)}
                            />
                          </Field>

                          {/* PAN */}
                          <Field label="PAN Number (if applicable)" icon={<FileText size={16} />}>
                            <input
                              type="text"
                              value={form.pan}
                              onChange={(e) => update('pan', e.target.value.toUpperCase())}
                              placeholder="AAAAA0000A"
                              maxLength={10}
                              className={inputClass(false)}
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email — shown in both modes */}
                    <Field label="Email Address" icon={<Mail size={16} />} error={errors.email}>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="you@business.com"
                        className={inputClass(!!errors.email)}
                      />
                    </Field>

                    {/* Password */}
                    <Field label="Password" icon={<Lock size={16} />} error={errors.password}>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                          className={`${inputClass(!!errors.password)} pr-10`}
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

                    {/* Confirm password — register only */}
                    <AnimatePresence mode="wait">
                      {mode === 'register' && (
                        <motion.div
                          key="confirm-password"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Field label="Confirm Password" icon={<Lock size={16} />} error={errors.confirmPassword}>
                            <div className="relative">
                              <input
                                type={showConfirm ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={(e) => update('confirmPassword', e.target.value)}
                                placeholder="Re-enter your password"
                                className={`${inputClass(!!errors.confirmPassword)} pr-10`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                              >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {mode === 'login' && (
                      <div className="flex justify-end">
                        <a href="/forgot-password" className="text-xs font-medium text-[#1857D6] hover:underline">
                          Forgot password?
                        </a>
                      </div>
                    )}

                    {/* Terms — register only */}
                    {mode === 'register' && (
                      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => {
                            setAgreed(e.target.checked)
                            if (serverError) setServerError(null)
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[#1857D6] focus:ring-[#1857D6]/40"
                        />
                        <span>
                          I agree to the{' '}
                          <a href="/terms" className="font-medium text-[#1857D6] hover:underline">
                            Terms &amp; Conditions
                          </a>{' '}
                          and{' '}
                          <a href="/vendor-agreement" className="font-medium text-[#1857D6] hover:underline">
                            Vendor Agreement
                          </a>
                          .
                        </span>
                      </label>
                    )}

                    {/* Server-side error banner */}
                    {serverError && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{serverError}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(62,122,28,0.35)] cursor-pointer"
                    >
                      <span className="absolute inset-0 h-full w-full -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{mode === 'register' ? 'Submitting…' : 'Signing in…'}</span>
                        </>
                      ) : (
                        <>
                          <span>{mode === 'register' ? 'Register as Selling Partner' : 'Sign In to Dashboard'}</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <p className="pt-1 text-center text-xs text-slate-400">
                      {mode === 'register' ? (
                        <>
                          Already a partner?{' '}
                          <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className="font-medium text-[#1857D6] hover:underline cursor-pointer"
                          >
                            Log in here
                          </button>
                        </>
                      ) : (
                        <>
                          New to the platform?{' '}
                          <button
                            type="button"
                            onClick={() => switchMode('register')}
                            className="font-medium text-[#1857D6] hover:underline cursor-pointer"
                          >
                            Register as a Selling Partner
                          </button>
                        </>
                      )}
                    </p>
                  </form>
                </>
              ) : needsEmailConfirm ? (
                <ConfirmEmailState onDone={resetAndClose} email={form.email} />
              ) : (
                <SuccessState onDone={resetAndClose} storeName={form.storeName} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
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
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-[#1857D6]">{icon}</span>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800',
    'placeholder:text-slate-400 transition-colors duration-200',
    'focus:bg-white focus:outline-none focus:ring-2',
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-[#1857D6] focus:ring-[#1857D6]/15',
  ].join(' ')
}

function SuccessState({ onDone, storeName }: { onDone: () => void; storeName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-6 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7BC142]/15 to-[#1857D6]/15">
        <CheckCircle2 size={32} className="text-[#3E7A1C]" />
      </div>
      <h3 className="text-xl font-semibold text-[#0B0F19]">Registration submitted!</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Thanks{storeName ? `, ${storeName}` : ''} — your account is ready. Our team will review
        your details and approve your Vendor / Seller account shortly. Once approved, you can
        list products, manage inventory and pricing, and track orders, commission and
        settlements from your dashboard.
      </p>
      <button
        onClick={onDone}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(24,87,214,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(24,87,214,0.5)] cursor-pointer"
      >
        Done
      </button>
    </motion.div>
  )
}

function ConfirmEmailState({ onDone, email }: { onDone: () => void; email: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-6 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1857D6]/15 to-[#7BC142]/15">
        <MailCheck size={32} className="text-[#1857D6]" />
      </div>
      <h3 className="text-xl font-semibold text-[#0B0F19]">Confirm your email</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        We&apos;ve sent a confirmation link to <strong className="text-[#0B0F19]">{email}</strong>.
        Click the link to activate your account, then log in to reach your Vendor / Seller Dashboard.
      </p>
      <button
        onClick={onDone}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(24,87,214,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(24,87,214,0.5)] cursor-pointer"
      >
        Got it
      </button>
    </motion.div>
  )
}