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
  Headphones,
  Percent,
  Megaphone,
  CalendarCheck,
  QrCode,
  Coffee,
  Shirt,
  Gift,
  AlertCircle,
  Share2,
  Users,
  Tag,
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
  Star,
  Wallet,
  Truck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

type Tier = 'Starter' | 'Growing' | 'Established' | 'Elite'

interface Benefit {
  id: string
  title: string
  description: string
  category: string | null
  minTier: Tier
  icon: LucideIcon
}

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center bg-white" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Benefits Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load your merchant benefits.'}</p>
      </div>
    )
  }

  const successfulReferrals = merchant.successful_referrals ?? 0
  const category = merchant.category ?? ''
  const tier = getTier(successfulReferrals)
  const tierIndex = TIER_RANK[tier]

  const nextTier = TIER_ORDER[tierIndex + 1]
  const nextThreshold = nextTier
    ? TIER_THRESHOLDS.find((t) => t.tier === nextTier)?.minReferrals ?? 0
    : null
  const referralsToNext = nextThreshold !== null ? Math.max(0, nextThreshold - successfulReferrals) : 0

  const relevantBenefits = benefits.filter((b) => b.category === null || b.category === category)
  const isUnlocked = (b: Benefit) => TIER_RANK[tier] >= TIER_RANK[b.minTier]

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

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
                  Explore all available benefits based on your tier and shop category.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Tier</p>
                <p className="text-sm font-bold text-[#1857D6]">{tier}</p>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Next Milestone</p>
                <p className="text-xs font-semibold text-slate-700">
                  {nextTier ? `${referralsToNext} ref${referralsToNext === 1 ? '' : 's'} to ${nextTier}` : 'Max Tier'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All Available Perks & Benefits</h2>
            <p className="text-xs text-slate-500">Unlocked perks are active, keep referring to unlock locked ones.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1857D6]">
            {relevantBenefits.length} Total Benefits
          </span>
        </div>

        {/* Product Cards Grid */}
        {relevantBenefits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-slate-200 bg-slate-50/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
              <Gift size={32} />
            </div>
            <p className="text-sm font-semibold text-slate-800">No benefits found</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              Check back later or contact support for category benefits.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relevantBenefits.map((b) => {
              const Icon = b.icon
              const unlocked = isUnlocked(b)
              const referralsNeeded = TIER_THRESHOLDS.find((t) => t.tier === b.minTier)?.minReferrals ?? 0
              const stillNeeded = Math.max(0, referralsNeeded - successfulReferrals)

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 shadow-sm hover:shadow-md ${
                    unlocked
                      ? 'border-slate-200/80 bg-white hover:border-blue-200'
                      : 'border-slate-200 bg-slate-50/60 opacity-90'
                  }`}
                >
                  <div>
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                          unlocked
                            ? 'bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon size={22} />
                      </div>

                      {unlocked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Lock size={12} />
                          {b.minTier} Tier
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-slate-900 mb-1">{b.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-6">
                      {b.description || 'Exclusive merchant perk designed to help your business grow.'}
                    </p>
                  </div>

                  {/* Card Footer / Progress info */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-400">
                      Requirement: <strong className="text-slate-700">{b.minTier} Tier</strong>
                    </span>
                    {!unlocked && (
                      <span className="font-semibold text-amber-600">
                        {stillNeeded > 0 ? `${stillNeeded} more ref${stillNeeded === 1 ? '' : 's'}` : 'Locked'}
                      </span>
                    )}
                    {unlocked && (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <Sparkles size={12} /> Ready to use
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}