// app/admin/settings/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Percent,
  Coins,
  Wallet,
  Share2,
  Wrench,
  ClipboardCheck,
  Save,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface SettingsForm {
  platform_name: string
  support_email: string
  support_phone: string
  default_commission_rate: string
  points_per_rupee: string
  point_value_in_rupees: string
  wallet_min_redeem_points: string
  referral_bonus_points: string
  referral_bonus_points_referee: string
  maintenance_mode: boolean
  new_vendor_requires_approval: boolean
}

const DEFAULTS: SettingsForm = {
  platform_name: '',
  support_email: '',
  support_phone: '',
  default_commission_rate: '',
  points_per_rupee: '',
  point_value_in_rupees: '',
  wallet_min_redeem_points: '',
  referral_bonus_points: '',
  referral_bonus_points_referee: '',
  maintenance_mode: false,
  new_vendor_requires_approval: true,
}

// Which JS type each key should be parsed back into when saving
const NUMERIC_KEYS = new Set<keyof SettingsForm>([
  'default_commission_rate',
  'points_per_rupee',
  'point_value_in_rupees',
  'wallet_min_redeem_points',
  'referral_bonus_points',
  'referral_bonus_points_referee',
])

const BOOLEAN_KEYS = new Set<keyof SettingsForm>(['maintenance_mode', 'new_vendor_requires_approval'])

export default function AdminSettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [form, setForm] = useState<SettingsForm>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
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
      return
    }

    setAuthorized(true)

    const { data, error: settingsError } = await supabase.from('settings').select('key, value')

    if (!settingsError && data) {
      const next = { ...DEFAULTS }
      data.forEach((row) => {
        const key = row.key as keyof SettingsForm
        if (key in next) {
          if (BOOLEAN_KEYS.has(key)) {
            ;(next[key] as boolean) = Boolean(row.value)
          } else {
            ;(next[key] as string) = String(
              typeof row.value === 'string' ? row.value : row.value ?? ''
            )
          }
        }
      })
      setForm(next)
    } else if (settingsError) {
      setError(settingsError.message)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const update = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rows = (Object.keys(form) as (keyof SettingsForm)[]).map((key) => {
        let value: unknown = form[key]
        if (NUMERIC_KEYS.has(key)) {
          const parsed = parseFloat(form[key] as string)
          value = Number.isNaN(parsed) ? 0 : parsed
        } else if (BOOLEAN_KEYS.has(key)) {
          value = Boolean(form[key])
        }
        return {
          key,
          value,
          updated_by: user?.id ?? null,
        }
      })

      const { error: upsertError } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
      if (upsertError) throw upsertError

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
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
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
          <SettingsIcon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">System Settings</h1>
          <p className="text-sm text-slate-500">Configure platform-wide defaults used across every module.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── General ─────────────────────────────────────────────── */}
        <SettingsSection icon={<Building2 size={17} />} title="General" description="Basic platform identity and contact details.">
          <FieldRow label="Platform Name" icon={<Building2 size={15} />}>
            <input
              type="text"
              value={form.platform_name}
              onChange={(e) => update('platform_name', e.target.value)}
              placeholder="RAKVIH Solutions"
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="Support Email" icon={<Mail size={15} />}>
            <input
              type="email"
              value={form.support_email}
              onChange={(e) => update('support_email', e.target.value)}
              placeholder="admin.dadbharat999@gmail.com"
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="Support Phone" icon={<Phone size={15} />}>
            <input
              type="tel"
              value={form.support_phone}
              onChange={(e) => update('support_phone', e.target.value)}
              placeholder="+91 90000 00000"
              className={inputClass}
            />
          </FieldRow>
        </SettingsSection>

        {/* ── Commission ──────────────────────────────────────────── */}
        <SettingsSection icon={<Percent size={17} />} title="Vendor Commission" description="Default commission applied to newly approved vendors.">
          <FieldRow label="Default Commission Rate (%)" icon={<Percent size={15} />}>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.default_commission_rate}
              onChange={(e) => update('default_commission_rate', e.target.value)}
              placeholder="5"
              className={inputClass}
            />
          </FieldRow>
        </SettingsSection>

        {/* ── Points & Wallet ─────────────────────────────────────── */}
        <SettingsSection icon={<Coins size={17} />} title="Points & Wallet" description="Loyalty point earning and redemption rates.">
          <FieldRow label="Points Earned per ₹1 Spent" icon={<Coins size={15} />}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.points_per_rupee}
              onChange={(e) => update('points_per_rupee', e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="₹ Value of 1 Redeemed Point" icon={<Wallet size={15} />}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.point_value_in_rupees}
              onChange={(e) => update('point_value_in_rupees', e.target.value)}
              placeholder="0.10"
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="Minimum Points to Redeem" icon={<Wallet size={15} />}>
            <input
              type="number"
              step="1"
              min="0"
              value={form.wallet_min_redeem_points}
              onChange={(e) => update('wallet_min_redeem_points', e.target.value)}
              placeholder="100"
              className={inputClass}
            />
          </FieldRow>
        </SettingsSection>

        {/* ── Referral Program ────────────────────────────────────── */}
        <SettingsSection icon={<Share2 size={17} />} title="Referral Program" description="Bonus points awarded on successful referrals.">
          <FieldRow label="Bonus to Referrer (points)" icon={<Share2 size={15} />}>
            <input
              type="number"
              step="1"
              min="0"
              value={form.referral_bonus_points}
              onChange={(e) => update('referral_bonus_points', e.target.value)}
              placeholder="50"
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="Bonus to New Merchant (points)" icon={<Share2 size={15} />}>
            <input
              type="number"
              step="1"
              min="0"
              value={form.referral_bonus_points_referee}
              onChange={(e) => update('referral_bonus_points_referee', e.target.value)}
              placeholder="25"
              className={inputClass}
            />
          </FieldRow>
        </SettingsSection>

        {/* ── Platform Controls ───────────────────────────────────── */}
        <SettingsSection icon={<Wrench size={17} />} title="Platform Controls" description="Global toggles that affect the entire platform.">
          <ToggleRow
            label="Maintenance Mode"
            description="Shows a maintenance banner to visitors and blocks new sign-ups."
            icon={<Wrench size={15} />}
            checked={form.maintenance_mode}
            onChange={(v) => update('maintenance_mode', v)}
          />
          <ToggleRow
            label="New Vendors Require Approval"
            description="If off, new vendor sign-ups are auto-approved instead of pending review."
            icon={<ClipboardCheck size={15} />}
            checked={form.new_vendor_requires_approval}
            onChange={(v) => update('new_vendor_requires_approval', v)}
          />
        </SettingsSection>

        {/* ── Save bar ────────────────────────────────────────────── */}
        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur px-5 py-4 shadow-lg">
          {saved && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"
            >
              <CheckCircle2 size={16} />
              Saved
            </motion.span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/15'

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function FieldRow({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-[#1857D6]">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string
  description: string
  icon: React.ReactNode
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 sm:col-span-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-[#1857D6]">{icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A]' : 'bg-slate-200'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}