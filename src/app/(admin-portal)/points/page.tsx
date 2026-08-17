'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Coins,
  Search,
  Loader2,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  IndianRupee,
  CheckCircle2,
  Pencil,
  Users,
  Sparkles,
  QrCode,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant {
  id: string
  business_name: string
}

interface Transaction {
  id: string
  merchant_id: string
  wallet_type: string
  transaction_type: string
  amount: number
  description: string | null
  created_at: string
}

type ConfigField = 'value_per_point' | 'points_per_referral' | 'joining_bonus_points' | 'scan_bonus_rs'
export default function AdminPointsLedgerPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Point value (₹ per point) state
  const [valuePerPoint, setValuePerPoint] = useState<number>(0)
  const [rateInput, setRateInput] = useState<string>('')
  const [editingRate, setEditingRate] = useState(false)
  const [rateSaving, setRateSaving] = useState(false)
  const [rateMessage, setRateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Points per referral state
  const [pointsPerReferral, setPointsPerReferral] = useState<number>(0)
  const [referralInput, setReferralInput] = useState<string>('')
  const [editingReferral, setEditingReferral] = useState(false)
  const [referralSaving, setReferralSaving] = useState(false)
  const [referralMessage, setReferralMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Joining bonus points state
  const [joiningBonusPoints, setJoiningBonusPoints] = useState<number>(0)
  const [joiningInput, setJoiningInput] = useState<string>('')
  const [editingJoining, setEditingJoining] = useState(false)
  const [joiningSaving, setJoiningSaving] = useState(false)
  const [joiningMessage, setJoiningMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Scan bonus points state (nullable in DB)
  const [scanBonusPoints, setScanBonusPoints] = useState<number | null>(null)
  const [scanInput, setScanInput] = useState<string>('')
  const [editingScan, setEditingScan] = useState(false)
  const [scanSaving, setScanSaving] = useState(false)
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Fetch Transactions, Merchants & Point Config ─────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        const [txRes, merchRes, configRes] = await Promise.all([
          supabase.from('merchant_transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('merchants').select('id, business_name'),
supabase
  .from('points_config')
  .select('value_per_point, points_per_referral, joining_bonus_points, scan_bonus_rs')
  .eq('id', 1)
  .single(),
        ])

        if (txRes.error || merchRes.error) {
          throw new Error('Failed to load ledger data.')
        }

        const txData = txRes.data as Transaction[]
        const merchData = merchRes.data as Merchant[]

        const map: Record<string, string> = {}
        merchData.forEach((m) => (map[m.id] = m.business_name))
        setMerchantMap(map)

        // Filter only POINTS transactions for this specific ledger
        setTransactions(txData.filter((tx) => tx.wallet_type === 'points'))

        if (!configRes.error && configRes.data) {
          setValuePerPoint(configRes.data.value_per_point)
          setRateInput(String(configRes.data.value_per_point))

          setPointsPerReferral(configRes.data.points_per_referral)
          setReferralInput(String(configRes.data.points_per_referral))

          setJoiningBonusPoints(configRes.data.joining_bonus_points)
          setJoiningInput(String(configRes.data.joining_bonus_points))

          setScanBonusPoints(configRes.data.scan_bonus_rs)
          setScanInput(configRes.data.scan_bonus_rs != null ? String(configRes.data.scan_bonus_rs) : '')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load ledger data.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // ── Generic Save Helper ──────────────────────────────────────────────
  const saveConfigField = async (
    field: ConfigField,
    value: number,
    setValue: (v: number) => void,
    setEditing: (v: boolean) => void,
    setSaving: (v: boolean) => void,
    setMessage: (v: { type: 'success' | 'error'; text: string } | null) => void,
    successText: string
  ) => {
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('points_config')
      .update({ [field]: value })
      .eq('id', 1)

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save.' })
      return
    }

    setValue(value)
    setEditing(false)
    setMessage({ type: 'success', text: successText })
  }

  // ── Save Point Value ─────────────────────────────────────────────────
  const handleSaveRate = async () => {
    const parsed = parseFloat(rateInput)
    if (isNaN(parsed) || parsed <= 0) {
      setRateMessage({ type: 'error', text: 'Enter a valid amount greater than 0.' })
      return
    }
    await saveConfigField(
      'value_per_point',
      parsed,
      setValuePerPoint,
      setEditingRate,
      setRateSaving,
      setRateMessage,
      'Point value updated successfully.'
    )
  }

  // ── Save Points Per Referral ─────────────────────────────────────────
  const handleSaveReferral = async () => {
    const parsed = parseInt(referralInput, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setReferralMessage({ type: 'error', text: 'Enter a valid whole number greater than 0.' })
      return
    }
    await saveConfigField(
      'points_per_referral',
      parsed,
      setPointsPerReferral,
      setEditingReferral,
      setReferralSaving,
      setReferralMessage,
      'Referral points updated successfully.'
    )
  }

  // ── Save Joining Bonus Points ────────────────────────────────────────
  const handleSaveJoining = async () => {
    const parsed = parseInt(joiningInput, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setJoiningMessage({ type: 'error', text: 'Enter a valid whole number greater than 0.' })
      return
    }
    await saveConfigField(
      'joining_bonus_points',
      parsed,
      setJoiningBonusPoints,
      setEditingJoining,
      setJoiningSaving,
      setJoiningMessage,
      'Joining bonus updated successfully.'
    )
  }

  // ── Save Scan Bonus Points ───────────────────────────────────────────
  const handleSaveScan = async () => {
    const parsed = parseInt(scanInput, 10)
    if (isNaN(parsed) || parsed < 0) {
      setScanMessage({ type: 'error', text: 'Enter a valid whole number (0 or more).' })
      return
    }
    await saveConfigField(
      'scan_bonus_rs',
      parsed,
      setScanBonusPoints,
      setEditingScan,
      setScanSaving,
      setScanMessage,
      'Scan bonus updated successfully.'
    )
  }

  // ── Calculate Stats ──────────────────────────────────────────────────
  const totalIssued = transactions.filter((t) => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0)
  const totalRedeemed = transactions.filter((t) => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0)
  const inCirculation = totalIssued - totalRedeemed

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredTx = transactions.filter((t) => {
    const matchesSearch =
      merchantMap[t.merchant_id]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'all' || t.transaction_type === typeFilter

    return matchesSearch && matchesType
  })

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Coins size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Points Ledger
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Platform-wide audit trail for all reward points issued and redeemed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Config Cards: Point Value, Referral, Joining Bonus, Scan Bonus */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Point Value Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <IndianRupee size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Point Value</h2>
                <p className="text-xs text-slate-500">The rupee value of 1 reward point.</p>
              </div>
            </div>

            {!editingRate ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{valuePerPoint} <span className="text-sm font-medium text-slate-400">/ point</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRate(true)
                    setRateInput(String(valuePerPoint))
                    setRateMessage(null)
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-[#1857D6]/30 hover:bg-[#1857D6]/5 hover:text-[#1857D6] cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-28 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-7 pr-3 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  disabled={rateSaving}
                  onClick={handleSaveRate}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rateSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRate(false)
                    setRateMessage(null)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {rateMessage && (
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                rateMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {rateMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
              )}
              <span>{rateMessage.text}</span>
            </div>
          )}
        </motion.div>

        {/* Points Per Referral Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Referral Points</h2>
                <p className="text-xs text-slate-500">Points awarded per successful referral.</p>
              </div>
            </div>

            {!editingReferral ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  {pointsPerReferral} <span className="text-sm font-medium text-slate-400">Pts</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReferral(true)
                    setReferralInput(String(pointsPerReferral))
                    setReferralMessage(null)
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-[#1857D6]/30 hover:bg-[#1857D6]/5 hover:text-[#1857D6] cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={referralSaving}
                  onClick={handleSaveReferral}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {referralSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReferral(false)
                    setReferralMessage(null)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {referralMessage && (
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                referralMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {referralMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
              )}
              <span>{referralMessage.text}</span>
            </div>
          )}
        </motion.div>

        {/* Joining Bonus Points Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Joining Bonus</h2>
                <p className="text-xs text-slate-500">Points awarded when a merchant joins.</p>
              </div>
            </div>

            {!editingJoining ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  {joiningBonusPoints} <span className="text-sm font-medium text-slate-400">Pts</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJoining(true)
                    setJoiningInput(String(joiningBonusPoints))
                    setJoiningMessage(null)
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-[#1857D6]/30 hover:bg-[#1857D6]/5 hover:text-[#1857D6] cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={joiningInput}
                  onChange={(e) => setJoiningInput(e.target.value)}
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={joiningSaving}
                  onClick={handleSaveJoining}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {joiningSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJoining(false)
                    setJoiningMessage(null)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {joiningMessage && (
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                joiningMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {joiningMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
              )}
              <span>{joiningMessage.text}</span>
            </div>
          )}
        </motion.div>

        {/* Scan Bonus Points Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <QrCode size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Scan Bonus</h2>
                <p className="text-xs text-slate-500">Points awarded per QR scan.</p>
              </div>
            </div>

            {!editingScan ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  {scanBonusPoints ?? '—'} <span className="text-sm font-medium text-slate-400">Pts</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingScan(true)
                    setScanInput(scanBonusPoints != null ? String(scanBonusPoints) : '')
                    setScanMessage(null)
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-[#1857D6]/30 hover:bg-[#1857D6]/5 hover:text-[#1857D6] cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={scanSaving}
                  onClick={handleSaveScan}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scanSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingScan(false)
                    setScanMessage(null)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {scanMessage && (
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                scanMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {scanMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
              )}
              <span>{scanMessage.text}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Issued</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalIssued.toLocaleString()} <span className="text-sm text-slate-400">Pts</span></h3>
          <p className="text-xs text-slate-400 mt-1">Joining bonuses, referrals, rewards</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Redeemed</span>
            <div className="p-2 bg-rose-50 rounded-lg"><TrendingDown size={16} className="text-rose-500" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalRedeemed.toLocaleString()} <span className="text-sm text-slate-400">Pts</span></h3>
          <p className="text-xs text-slate-400 mt-1">Used on E-Commerce purchases</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">In Circulation</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Wallet size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{inCirculation.toLocaleString()} <span className="text-sm text-slate-400">Pts</span></h3>
          <p className="text-xs text-slate-400 mt-1">Currently active in merchant wallets (≈ ₹{(inCirculation * valuePerPoint).toLocaleString()})</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by merchant or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>

        <div className="relative w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-44 appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
          >
            <option value="all">All Transactions</option>
            <option value="credit">Issued (Credit)</option>
            <option value="debit">Redeemed (Debit)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <History size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">Showing {filteredTx.length} of {transactions.length} point transactions.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Merchant</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Description</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Date</th>
                <th className="py-3 px-4 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    No point transactions found.
                  </td>
                </tr>
              ) : (
                filteredTx.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-900">
                      {merchantMap[t.merchant_id] || 'Unknown Merchant'}
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell text-slate-600">
                      {t.description || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-slate-500 hidden sm:table-cell">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 font-bold ${
                        t.transaction_type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.transaction_type === 'credit' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                        {t.transaction_type === 'credit' ? '+' : '-'}{t.amount} Pts
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}