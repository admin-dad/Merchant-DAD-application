'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  History,
  Loader2,
  AlertCircle,
  Users,
  UserCheck,
  Clock,
} from 'lucide-react'

interface ReferralItem {
  id: string
  referred_business_name: string
  status: 'pending' | 'completed' | 'rewarded'
  created_at: string
}

export default function ReferralHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsPerReferral, setPointsPerReferral] = useState<number>(0)
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const [merchantRes, configRes] = await Promise.all([
        supabase
          .from('merchants')
          .select('id, business_name')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('points_config')
          .select('points_per_referral')
          .eq('id', 1)
          .single(),
      ])

      if (cancelled) return

      if (!configRes.error && configRes.data) {
        setPointsPerReferral(configRes.data.points_per_referral)
      }

      const merchantData = merchantRes.data

      if (!merchantData) {
        setError('Could not load your merchant profile.')
        setLoading(false)
        return
      }

      const { data: refList, error: refError } = await supabase
        .from('referrals')
        .select('id, referred_business_name, status, created_at')
        .eq('referrer_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (!refError && refList && !cancelled) {
        setReferralsList(refList as ReferralItem[])
      }

      if (!cancelled) setLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  // ── Group referrals into Today / Yesterday / Last 7 Days / Last 30 Days / by month ──
  const groupedReferrals = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    const startOfMonth = new Date(startOfToday)
    startOfMonth.setDate(startOfMonth.getDate() - 30)

    const buckets: Record<string, ReferralItem[]> = {}
    const bucketOrder: string[] = []

    const pushToBucket = (label: string, item: ReferralItem) => {
      if (!buckets[label]) {
        buckets[label] = []
        bucketOrder.push(label)
      }
      buckets[label].push(item)
    }

    referralsList.forEach((item) => {
      const itemDate = new Date(item.created_at)
      let label: string

      if (itemDate >= startOfToday) label = 'Today'
      else if (itemDate >= startOfYesterday) label = 'Yesterday'
      else if (itemDate >= startOfWeek) label = 'Last 7 Days'
      else if (itemDate >= startOfMonth) label = 'Last 30 Days'
      else
        label = itemDate.toLocaleString('en-IN', {
          month: 'long',
          year: 'numeric',
        })

      pushToBucket(label, item)
    })

    const priority = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days']
    const fixed = priority.filter((label) => buckets[label])
    const monthBuckets = bucketOrder.filter((label) => !priority.includes(label))

    return [...fixed, ...monthBuckets].map((label) => ({
      label,
      items: buckets[label],
    }))
  }, [referralsList])

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatFullDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
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
              <History size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Referral History
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Full timeline of merchants you&apos;ve invited.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Referrals</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Referral List */}
      {groupedReferrals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-20 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
            <Users size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No referrals yet</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Share your referral link to start building your network.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedReferrals.map((group, groupIdx) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: groupIdx * 0.05 }}
            >
              <div className="mb-3 flex items-center gap-3 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400">
                  {group.items.length} referral{group.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {group.items.map((item) => {
                  const earned = item.status === 'completed' || item.status === 'rewarded'
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50/50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            earned
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {earned ? <UserCheck size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.referred_business_name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase capitalize ${
                                earned
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-amber-50 text-amber-600'
                              }`}
                            >
                              {item.status}
                            </span>
                            {formatFullDate(item.created_at)} · {formatTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {earned ? (
                          <span className="text-sm font-bold text-emerald-600">
                            +{pointsPerReferral} Pts
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}