'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Share2,
  Copy,
  Check,
  Users,
  UserCheck,
  Gift,
  Loader2,
  QrCode,
  Coins,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface ReferralItem {
  id: string
  referred_business_name: string
  status: 'pending' | 'completed' | 'rewarded'
  created_at: string
}

export default function ReferralsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState<string>('My Business')
  const [referralCode, setReferralCode] = useState<string>('')
  
  // Stats
  const [referredCount, setReferredCount] = useState<number>(0)
  const [successfulReferrals, setSuccessfulReferrals] = useState<number>(0)
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([])

  // Points config
  const [pointsPerReferral, setPointsPerReferral] = useState<number>(0)
  const [valuePerPoint, setValuePerPoint] = useState<number>(0)

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Fetch Merchant Data and Points Config concurrently
      const [merchantRes, configRes] = await Promise.all([
        supabase
          .from('merchants')
          .select('id, business_name, referral_code, referred_count, successful_referrals')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('points_config')
          .select('points_per_referral, value_per_point')
          .eq('id', 1)
          .single(),
      ])

      if (cancelled) return

      const merchantData = merchantRes.data

      if (!configRes.error && configRes.data) {
        setPointsPerReferral(configRes.data.points_per_referral)
        setValuePerPoint(configRes.data.value_per_point)
      }

      if (merchantData) {
        if (merchantData.business_name) setBusinessName(merchantData.business_name)
        if (merchantData.referral_code) setReferralCode(merchantData.referral_code)

        // Fetch referrals history — column is referrer_id
        const { data: refList } = await supabase
          .from('referrals')
          .select('id, referred_business_name, status, created_at')
          .eq('referrer_id', merchantData.id)
          .order('created_at', { ascending: false })

        if (refList && !cancelled) {
          const currentRefList = refList as ReferralItem[]
          setReferralsList(currentRefList)
          
          // Calculate stats directly from the table to guarantee UI consistency
          const totalInvited = currentRefList.length
          const totalSuccessful = currentRefList.filter(
            (r) => r.status === 'completed' || r.status === 'rewarded'
          ).length

          setReferredCount(totalInvited)
          setSuccessfulReferrals(totalSuccessful)
        }
      }

      if (!cancelled) setLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const referralLink = referralCode ? `${origin}/signup?ref=${referralCode}` : ''

  // Derived state: Automatically sync points based strictly on successful referrals
  const pointsEarned = successfulReferrals * pointsPerReferral
  const pointsEarnedValue = pointsEarned * valuePerPoint

  const handleCopyCode = () => {
    if (!referralCode) return
    navigator.clipboard.writeText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShare = async () => {
    if (!referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our Platform',
          text: `Use my referral code ${referralCode} to sign up and start growing your business!`,
          url: referralLink,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
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
              <Gift size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Refer & Earn
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Invite fellow merchants to join {businessName} and track your rewards.
                {pointsPerReferral > 0 && (
                  <>
                    {' '}Earn <span className="font-semibold text-slate-700">{pointsPerReferral} pts</span> per successful referral
                    {' '}(<span className="font-mono">{pointsPerReferral} × ₹{valuePerPoint} = ₹{(pointsPerReferral * valuePerPoint).toFixed(2)}</span>).
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleShare}
            disabled={!referralLink}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={16} />
            <span>Share Referral Link</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Referrals</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {referredCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Merchants invited</span>
          </div>
        </motion.div>

        {/* Successful Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Successful Referrals</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {successfulReferrals}
            </span>
            <span className="text-xs font-medium text-emerald-600">Completed & Verified</span>
          </div>
        </motion.div>

        {/* Points Earned from Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Points Earned</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {pointsEarned.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">Pts</span>
          </div>
          <p className="mt-1 text-xs font-medium text-amber-600 font-mono">
            ₹{pointsEarnedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value
          </p>
        </motion.div>
      </div>

      {/* Share Section (Code & Link) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <QrCode size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your Unique Referral Credentials</h2>
            <p className="text-xs text-slate-500">Share your code or direct link with friends and business partners.</p>
          </div>
        </div>

        {referralCode ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Referral Code Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referral Code</label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                <span className="font-mono text-base font-bold tracking-wide text-slate-800">{referralCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Referral Link Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referral Link</label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                <span className="truncate text-sm font-medium text-slate-600 mr-2">{referralLink}</span>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Your referral code hasn&apos;t been generated yet. It&apos;s created automatically once your
            merchant profile is set up — refresh this page in a moment.
          </p>
        )}
      </motion.div>

      {/* Referrals History Table / List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Referred Merchants History</h2>
              <p className="text-xs text-slate-500">Track status of people who used your invite link or code.</p>
            </div>
          </div>
        </div>

        {referralsList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Users size={24} />
            </div>
            <p className="text-sm font-medium text-slate-600">No referrals yet</p>
            <p className="mt-1 text-xs text-slate-400">Share your referral link above to start building your network!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Business Name</th>
                  <th className="pb-3 font-semibold">Joined Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referralsList.map((item) => {
                  const earned = item.status === 'completed' || item.status === 'rewarded'
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-medium text-slate-900">{item.referred_business_name}</td>
                      <td className="py-4 text-slate-500">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            earned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {earned ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-amber-600">+{pointsPerReferral} Pts</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {pointsPerReferral} × ₹{valuePerPoint} = ₹{(pointsPerReferral * valuePerPoint).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}