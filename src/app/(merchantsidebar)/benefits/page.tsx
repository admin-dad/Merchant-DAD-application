'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Award,
  Lock,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Star,
  Headphones,
  Percent,
  Megaphone,
  CalendarCheck,
  QrCode,
  Coffee,
  Shirt,
  Gift,
  AlertCircle,
  Sparkles,
  Trophy,
  Truck,
  Wallet,
  BadgeCheck,
  Palette,
  Wrench,
  Stethoscope,
  Smartphone,
  Sofa,
  Gem,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Share2,
  Users,
  Tag,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Benefits now come from the `merchant_benefits` table in Supabase.
// This file only keeps the icon lookup + tier logic locally.
// ─────────────────────────────────────────────────────────────────────────

type Tier = 'Starter' | 'Growing' | 'Established' | 'Elite'

interface Benefit {
  id: string
  title: string
  description: string
  category: string | null // null = applies to every category ('all' in DB)
  minTier: Tier
  icon: LucideIcon
}

// Raw shape returned from the merchant_benefits table.
interface DBBenefitRow {
  id: string
  title: string
  description: string | null
  benefit_type: string
  target_category: string
  status: string
  min_tier: Tier
}

interface MerchantData {
  id: string
  business_name: string
  category: string | null
  successful_referrals: number
}

// Tiers are derived automatically from successful_referrals — no separate
// "plan" field needed. Adjust these thresholds any time.
const TIER_THRESHOLDS: { tier: Tier; minReferrals: number }[] = [
  { tier: 'Elite', minReferrals: 5 },
  { tier: 'Established', minReferrals: 2 },
  { tier: 'Growing', minReferrals: 1 },
  { tier: 'Starter', minReferrals: 0 },
]

const TIER_RANK: Record<Tier, number> = {
  Starter: 0,
  Growing: 1,
  Established: 2,
  Elite: 3,
}

const TIER_ORDER: Tier[] = ['Starter', 'Growing', 'Established', 'Elite']

function getTier(successfulReferrals: number): Tier {
  const match = TIER_THRESHOLDS.find((t) => successfulReferrals >= t.minReferrals)
  return match?.tier ?? 'Starter'
}

// ── Icon lookup, keyed by `benefit_type` in the DB ─────────────────────
// Add/rename keys here to match whatever values you store in benefit_type.
const BENEFIT_ICON_MAP: Record<string, LucideIcon> = {
  'featured-listing': Star,
  'qr-code': QrCode,
  'verified-badge': BadgeCheck,
  'priority-support': Headphones,
  'social-shoutout': Share2,
  analytics: BarChart3,
  discount: Percent,
  'early-payout': Wallet,
  'account-manager': Users,
  'protection-cover': ShieldCheck,
  banner: Megaphone,
  'campaign-invite': Tag,
  'menu-ordering': QrCode,
  reservation: CalendarCheck,
  delivery: Truck,
  loyalty: Coffee,
  events: CalendarCheck,
  lookbook: Shirt,
  collection: Palette,
  'bulk-tools': ClipboardList,
  'essentials-tag': Tag,
  warranty: ShieldCheck,
  repair: Smartphone,
  appointment: CalendarCheck,
  refill: Stethoscope,
  quote: Wrench,
  visualizer: Sofa,
  certification: Gem,
  booking: CalendarCheck,
}

const DEFAULT_BENEFIT_ICON: LucideIcon = Gift

function mapRowToBenefit(row: DBBenefitRow): Benefit {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.target_category === 'all' ? null : row.target_category,
    minTier: row.min_tier,
    icon: BENEFIT_ICON_MAP[row.benefit_type] ?? DEFAULT_BENEFIT_ICON,
  }
}

export default function MerchantBenefitsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Fetch Merchant + Benefits ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, business_name, category, successful_referrals')
        .eq('user_id', user.id)
        .single()

      if (merchantError || !merchantData) {
        setError('Could not load your merchant profile.')
        setLoading(false)
        return
      }

      setMerchant(merchantData as MerchantData)

      const merchantCategory = (merchantData as MerchantData).category ?? ''

      // Pull benefits that are active AND either apply to every category
      // ('all') or match this merchant's specific category.
      const { data: benefitRows, error: benefitsError } = await supabase
        .from('merchant_benefits')
        .select('id, title, description, benefit_type, target_category, status, min_tier')
        .eq('status', 'active')
        .or(`target_category.eq.all,target_category.eq.${merchantCategory}`)

      if (benefitsError) {
        setError('Could not load your benefits.')
        setLoading(false)
        return
      }

      setBenefits(((benefitRows ?? []) as DBBenefitRow[]).map(mapRowToBenefit))
      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  // ── Loading State UI ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State UI ──────────────────────────────────────────────────
  if (error || !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Benefits Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load your merchant benefits.'}</p>
      </div>
    )
  }

  // ── Derived Data ─────────────────────────────────────────────────────
  const successfulReferrals = merchant.successful_referrals ?? 0
  const category = merchant.category ?? ''
  const tier = getTier(successfulReferrals)
  const tierIndex = TIER_RANK[tier]

  const nextTier = TIER_ORDER[tierIndex + 1]
  const nextThreshold = nextTier
    ? TIER_THRESHOLDS.find((t) => t.tier === nextTier)?.minReferrals ?? 0
    : null
  const referralsToNext = nextThreshold !== null ? Math.max(0, nextThreshold - successfulReferrals) : 0

  // benefits is already filtered server-side by category/status; still
  // keep the guard here in case client-side re-renders happen.
  const relevantBenefits = benefits.filter((b) => b.category === null || b.category === category)
  const isUnlocked = (b: Benefit) => TIER_RANK[tier] >= TIER_RANK[b.minTier]
  const unlocked = relevantBenefits.filter(isUnlocked)
  const locked = relevantBenefits.filter((b) => !isUnlocked(b))

  const generalCount = relevantBenefits.filter((b) => b.category === null).length
  const categoryCount = relevantBenefits.filter((b) => b.category !== null).length

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Award size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Benefits
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Benefits assigned based on your category, tier and referral performance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Tier</span>
            <span className="rounded-full bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-3 py-1 text-xs font-bold text-white">
              {tier}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Widgets Grid */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Tier</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Trophy size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{tier}</h3>
          <p className="text-xs text-slate-400 mt-1">Based on successful referrals</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Successful Referrals</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp size={16} className="text-emerald-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{successfulReferrals}</h3>
          <p className="text-xs text-slate-400 mt-1">All-time performance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Benefits</span>
            <div className="p-2 bg-blue-50 rounded-lg"><CheckCircle2 size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{unlocked.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Currently unlocked for you</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locked Benefits</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Lock size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{locked.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Still to unlock</p>
        </motion.div>

      </div>

      {/* Breakdown Cards */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6] transition-transform group-hover:scale-105">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">General Benefits</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{generalCount}</p>
            <p className="text-xs font-medium text-slate-400">Apply to every category</p>
          </div>
        </div>

        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C] transition-transform group-hover:scale-105">
            <Award size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Category Benefits</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{categoryCount}</p>
            <p className="text-xs font-medium text-slate-400">{category || 'Not set'}</p>
          </div>
        </div>

        <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-purple-200 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Next Tier</p>
            <p className="text-2xl font-bold text-[#0B0F19]">{nextTier ?? 'Max reached'}</p>
            <p className="text-xs font-medium text-slate-400">
              {nextTier ? `${referralsToNext} referral${referralsToNext === 1 ? '' : 's'} away` : "You're at the top"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

        {/* Benefits List (Left Column - 7/12) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Your Active Benefits</h2>
              <p className="text-xs text-slate-500">Everything currently unlocked for your shop.</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {unlocked.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Gift size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No benefits unlocked yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Grow your referral count to unlock benefits — check the summary panel for what&apos;s next.
                </p>
              </div>
            ) : (
              unlocked.map((b) => {
                const Icon = b.icon
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Tier Progress Summary (Right Column - 5/12) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Unlock More Benefits</h2>
              <p className="text-xs text-slate-500">What&apos;s still locked, and how to get there.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1857D6]/5 to-[#7BC142]/5 border border-slate-200 text-center">
              <p className="text-sm font-medium text-slate-500">Current Tier</p>
              <h3 className="text-4xl font-bold text-[#0B0F19] mt-2">{tier}</h3>
              <p className="text-xs text-slate-400 mt-2">
                {nextTier
                  ? `${referralsToNext} more successful referral${referralsToNext === 1 ? '' : 's'} to reach ${nextTier}`
                  : "You've reached the highest tier"}
              </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {locked.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">
                  You&apos;ve unlocked everything available right now. 🎉
                </p>
              ) : (
                locked.map((b) => {
                  const Icon = b.icon
                  const referralsForThisBenefit =
                    TIER_THRESHOLDS.find((t) => t.tier === b.minTier)?.minReferrals ?? 0
                  const stillNeeded = Math.max(0, referralsForThisBenefit - successfulReferrals)
                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center opacity-90"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                        <Icon size={16} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{b.title}</p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-1">
                        {stillNeeded > 0
                          ? `${stillNeeded} referral${stillNeeded === 1 ? '' : 's'} to unlock`
                          : `Reach ${b.minTier} to unlock`}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}