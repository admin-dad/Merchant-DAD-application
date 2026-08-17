// app/admin-referrals/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  X,
  Clock,
  Store,
  Users,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  Link2,
  Phone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string
  business_name: string
  owner_name: string | null
  mobile: string | null
  category: string | null
  sub_category: string | null
  status: string
  created_at: string
  referral_code: string | null
  referred_by: string | null // stores the REFERRER's referral_code, not an id
  referred_count: number | null
  successful_referrals: number | null
}

interface MerchantWithReferrals extends MerchantRow {
  referredMerchants: MerchantRow[] // merchants whose referred_by === this.referral_code
  referralCount: number
  successCount: number
  lastReferralAt: string | null
}

type StatusFilter = 'all' | 'has_code' | 'no_code' | 'has_referrals'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'has_referrals', label: 'Has Referrals' },
  { key: 'has_code', label: 'Has Code' },
  { key: 'no_code', label: 'No Code Yet' },
]

// A referral counts as "successful" once the referred merchant is approved.
// Change this if your business logic differs (e.g. 'active' instead of 'approved').
const SUCCESS_STATUSES = ['approved', 'active']

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AdminReferralsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [merchants, setMerchants] = useState<MerchantWithReferrals[]>([])
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithReferrals | null>(null)

  const [copiedField, setCopiedField] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // ── Load ──────────────────────────────────────────────────────────
  const loadAll = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        setRefreshing(false)
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
        setRefreshing(false)
        return
      }

      setAuthorized(true)

      // Single source of truth: the merchants table. `referred_by` on a
      // merchant row holds the REFERRAL_CODE of whoever referred them —
      // it is NOT a foreign key to another merchant's id, and there is no
      // separate `referrals` table. So referrals are derived by matching
      // referred_by === referral_code across the same table.
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select(
          'id, business_name, owner_name, mobile, category, sub_category, status, created_at, referral_code, referred_by, referred_count, successful_referrals'
        )
        .order('created_at', { ascending: false })

      if (merchantError) {
        setError(merchantError.message || 'Could not load referral data.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      const allMerchants: MerchantRow[] = merchantData || []

      // Map: referral_code -> merchants that used that code (referred_by)
      const referredByCode = new Map<string, MerchantRow[]>()
      allMerchants.forEach((m) => {
        if (!m.referred_by) return
        if (!referredByCode.has(m.referred_by)) referredByCode.set(m.referred_by, [])
        referredByCode.get(m.referred_by)!.push(m)
      })

      const merged: MerchantWithReferrals[] = allMerchants.map((m) => {
        const referredMerchants = m.referral_code ? referredByCode.get(m.referral_code) || [] : []
        const successCount = referredMerchants.filter((r) => SUCCESS_STATUSES.includes(r.status)).length
        return {
          ...m,
          referredMerchants,
          referralCount: referredMerchants.length,
          successCount,
          lastReferralAt: referredMerchants[0]?.created_at ?? null,
        }
      })

      setMerchants(merged)
      setLoading(false)
      setRefreshing(false)
    },
    [supabase]
  )

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Keep the open modal's data fresh if a refresh happens while it's open
  useEffect(() => {
    if (!selectedMerchant) return
    const updated = merchants.find((m) => m.id === selectedMerchant.id)
    if (updated) setSelectedMerchant(updated)
  }, [merchants]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMerchants = merchants.length
    const totalReferrals = merchants.reduce((sum, m) => sum + m.referralCount, 0)
    const totalSuccessful = merchants.reduce((sum, m) => sum + m.successCount, 0)
    const merchantsWithCode = merchants.filter((m) => !!m.referral_code).length
    return { totalMerchants, totalReferrals, totalSuccessful, merchantsWithCode }
  }, [merchants])

  const visibleMerchants = useMemo(() => {
    let list = [...merchants]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (m) =>
          m.business_name.toLowerCase().includes(q) ||
          (m.referral_code || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter === 'has_code') list = list.filter((m) => !!m.referral_code)
    if (statusFilter === 'no_code') list = list.filter((m) => !m.referral_code)
    if (statusFilter === 'has_referrals') list = list.filter((m) => m.referralCount > 0)

    // Highest referral count first
    list.sort((a, b) => b.referralCount - a.referralCount)

    return list
  }, [merchants, search, statusFilter])

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField((cur) => (cur === fieldKey ? null : cur)), 2000)
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
            <Gift size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Referral Tracking</h1>
            <p className="text-sm text-slate-500">All vendors, their referral codes, links, and invite activity.</p>
          </div>
        </div>
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#1857D6]' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Store size={18} />}
          label="Total Vendors"
          value={stats.totalMerchants.toLocaleString('en-IN')}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<Link2 size={18} />}
          label="Vendors With Code"
          value={stats.merchantsWithCode.toLocaleString('en-IN')}
          accent="from-violet-500/10 to-violet-500/5 text-violet-600"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Total Referrals"
          value={stats.totalReferrals.toLocaleString('en-IN')}
          accent="from-amber-500/10 to-amber-500/5 text-amber-600"
        />
        <StatCard
          icon={<UserCheck size={18} />}
          label="Successful Referrals"
          value={stats.totalSuccessful.toLocaleString('en-IN')}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business or code..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visibleMerchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <Gift size={26} />
            </div>
            <p className="text-sm font-medium text-slate-600">No vendors match your filters</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Vendor</th>
                  <th className="px-5 py-3.5">Referral Code</th>
                  <th className="px-5 py-3.5">Referral Link</th>
                  <th className="px-5 py-3.5">Referrals</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMerchants.map((merchant) => {
                  const link = merchant.referral_code
                    ? `${origin}/signup?ref=${merchant.referral_code}`
                    : ''
                  const codeKey = `code-${merchant.id}`
                  const linkKey = `link-${merchant.id}`
                  return (
                    <tr key={merchant.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6] to-[#7BC142] text-xs font-semibold text-white">
                            {merchant.business_name.trim().charAt(0).toUpperCase() || 'M'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{merchant.business_name}</p>
                            <p className="truncate text-xs text-slate-400 capitalize">{merchant.status}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {merchant.referral_code ? (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                              {merchant.referral_code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(merchant.referral_code!, codeKey)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              aria-label="Copy code"
                            >
                              {copiedField === codeKey ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not generated yet</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {link ? (
                          <div className="flex items-center gap-1.5">
                            <span className="max-w-[220px] truncate text-xs text-slate-500">{link}</span>
                            <button
                              onClick={() => copyToClipboard(link, linkKey)}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              aria-label="Copy link"
                            >
                              {copiedField === linkKey ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1857D6]">
                          <Users size={12} />
                          {merchant.referralCount.toLocaleString('en-IN')}
                        </span>
                        {merchant.successCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <UserCheck size={12} />
                            {merchant.successCount}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedMerchant(merchant)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#1857D6] hover:text-[#1857D6] transition-colors cursor-pointer"
                        >
                          <Gift size={13} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup modal */}
      <MerchantReferralModal
        merchant={selectedMerchant}
        origin={origin}
        onClose={() => setSelectedMerchant(null)}
        formatDate={formatDate}
        copyToClipboard={copyToClipboard}
        copiedField={copiedField}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Merchant referral detail popup
// ─────────────────────────────────────────────────────────────────────────

function MerchantReferralModal({
  merchant,
  origin,
  onClose,
  formatDate,
  copyToClipboard,
  copiedField,
}: {
  merchant: MerchantWithReferrals | null
  origin: string
  onClose: () => void
  formatDate: (iso: string) => string
  copyToClipboard: (text: string, key: string) => void
  copiedField: string | null
}) {
  const link = merchant?.referral_code ? `${origin}/signup?ref=${merchant.referral_code}` : ''

  return (
    <AnimatePresence>
      {merchant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <div className="mb-6 pr-8">
                <h2 className="text-xl font-semibold text-[#0B0F19]">{merchant.business_name}</h2>
                <p className="mt-1 text-sm text-slate-500 capitalize">
                  {merchant.status} · Merchant ID: {merchant.id.substring(0, 8)}...
                  {merchant.referred_by ? (
                    <>
                      {' '}
                      · Referred by code:{' '}
                      <span className="font-mono font-semibold text-slate-600">{merchant.referred_by}</span>
                    </>
                  ) : null}
                </p>
              </div>

              {/* Code + Link */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referral Code</label>
                  {merchant.referral_code ? (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
                      <span className="font-mono text-sm font-bold text-slate-800">{merchant.referral_code}</span>
                      <button
                        onClick={() => copyToClipboard(merchant.referral_code!, 'modal-code')}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copiedField === 'modal-code' ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                        {copiedField === 'modal-code' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Not generated yet</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referral Link</label>
                  {link ? (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
                      <span className="truncate text-xs font-medium text-slate-600 mr-2">{link}</span>
                      <button
                        onClick={() => copyToClipboard(link, 'modal-link')}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copiedField === 'modal-link' ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                        {copiedField === 'modal-link' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">—</p>
                  )}
                </div>
              </div>

              {/* Referral history — merchants whose referred_by matches this merchant's referral_code */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Referred Vendors</h3>
                <span className="text-xs font-medium text-slate-400">
                  {merchant.referredMerchants.length}{' '}
                  {merchant.referredMerchants.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
                {merchant.referredMerchants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <Users size={26} />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No referrals yet</p>
                    <p className="mt-1 text-xs text-slate-400">
                      This vendor hasn&apos;t referred anyone using their code or link.
                    </p>
                  </div>
                ) : (
                  merchant.referredMerchants.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 hover:border-slate-300 hover:bg-slate-50/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                          <Store size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{ref.business_name}</p>
                          {ref.mobile && (
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone size={11} />
                              {ref.mobile}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            SUCCESS_STATUSES.includes(ref.status)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {ref.status}
                        </span>
                        <p className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-slate-400">
                          <Clock size={12} />
                          {formatDate(ref.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}