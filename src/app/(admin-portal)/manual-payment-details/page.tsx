// app/admin/settings/page.tsx
'use client'

import FileUploadButton from '@/components/FileUploadButton'
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
  Save,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface SettingsForm {
  payment_qr_url: string
  payment_upi_id: string
  payment_bank_name: string
  payment_account_name: string
  payment_account_number: string
  payment_ifsc: string

}

const DEFAULTS: SettingsForm = {
  payment_qr_url: '',
  payment_upi_id: '',
  payment_bank_name: '',
  payment_account_name: '',
  payment_account_number: '',
  payment_ifsc: '',

}

export default function AdminManualPaymentSettingsPage() {
  const supabase = createAdminClient()

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
          next[key] = String(row.value ?? '')
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
        const value = form[key]
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
      <div className="admin-page-header mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
          <SettingsIcon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Manual Payment Details</h1>
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
<SettingsSection icon={<Building2 size={17} />} title="Manual Payment Details" description="Manage QR, UPI and bank details shown in the merchant manual-payment popup."><FieldRow label="Payment QR image URL (HTTPS)" icon={<Building2 size={15} />}><input type="text" value={form.payment_qr_url} onChange={event => update('payment_qr_url', event.target.value)} className={inputClass} /></FieldRow><FieldRow label="UPI ID" icon={<Building2 size={15} />}><input type="text" value={form.payment_upi_id} onChange={event => update('payment_upi_id', event.target.value)} className={inputClass} /></FieldRow><FieldRow label="Bank name" icon={<Building2 size={15} />}><input type="text" value={form.payment_bank_name} onChange={event => update('payment_bank_name', event.target.value)} className={inputClass} /></FieldRow><FieldRow label="Account holder name" icon={<Building2 size={15} />}><input type="text" value={form.payment_account_name} onChange={event => update('payment_account_name', event.target.value)} className={inputClass} /></FieldRow><FieldRow label="Account number" icon={<Building2 size={15} />}><input type="text" value={form.payment_account_number} onChange={event => update('payment_account_number', event.target.value)} className={inputClass} /></FieldRow><FieldRow label="IFSC" icon={<Building2 size={15} />}><input type="text" value={form.payment_ifsc} onChange={event => update('payment_ifsc', event.target.value)} className={inputClass} /></FieldRow><label className="block text-sm text-slate-700">Upload payment QR (PNG/JPG/WebP, up to 5 MB)<FileUploadButton label="Upload QR Image" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){alert('Choose an image under 5 MB.');return}const path=`payment-qr/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;const {error}=await supabase.storage.from('product-images').upload(path,file);if(error){alert(error.message);return}update('payment_qr_url',supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)}} /></label>{form.payment_qr_url&&<img src={form.payment_qr_url} alt="Payment QR preview" className="h-48 w-48 object-contain"/>}<p className="text-xs text-slate-500">Recommended: 1000 × 1000 px. Save settings after uploading. Manual transfers require admin verification.</p></SettingsSection>
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
            {saving ? 'Saving...' : 'Save Payment Details'}
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
