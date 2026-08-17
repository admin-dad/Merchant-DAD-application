'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket,
  Eye,
  Award,
  Clock,
  Loader2,
  AlertCircle,
  Smartphone,
  Gift,
  CheckCircle2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData {
  id: string
  business_name: string
}

interface ScanRecord {
  id: string
  customer_name: string | null
  customer_phone: string | null
  status: string // 'Pending', 'Reward Won', 'No Win'
  prize_won: string | null
  created_at: string
}

export default function ScratchCardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Fetch Merchant Data & Scratch Card Participations ────────────────
  useEffect(() => {
    const fetchCampaignData = async () => {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, business_name')
        .eq('user_id', user.id)
        .single()

      if (merchantError || !merchantData) {
        setError('Could not load your merchant profile.')
        setLoading(false)
        return
      }

      setMerchant(merchantData)

      // Fetch all scans associated with this merchant
      const { data: scanData, error: scanError } = await supabase
        .from('qr_scans')
        .select('id, customer_name, customer_phone, status, prize_won, created_at')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })

      if (!scanError && scanData) {
        setScans(scanData as ScanRecord[])
      }

      setLoading(false)
    }

    fetchCampaignData()
  }, [router, supabase])

  // ── Calculate Scratch Card Stats ────────────────────────────────────
  const totalIssued = scans.length
  const totalOpened = scans.filter(s => s.status === 'Reward Won' || s.status === 'No Win').length
  const totalWinners = scans.filter(s => s.status === 'Reward Won').length
  const pendingRewards = scans.filter(s => s.status === 'Pending') // Assuming pending means unplayed or unfulfilled

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

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
        <h2 className="text-xl font-semibold text-slate-900">Campaign Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load scratch card data.'}</p>
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
              <Ticket size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Scratch Card Campaigns
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track customer participation, issued scratch cards, and reward distribution.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widgets Grid */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Issued */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Issued</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Ticket size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalIssued}</h3>
          <p className="text-xs text-slate-400 mt-1">Cards generated via QR scans</p>
        </motion.div>

        {/* Total Opened/Played */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Opened</span>
            <div className="p-2 bg-slate-100 rounded-lg"><Eye size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalOpened}</h3>
          <p className="text-xs text-slate-400 mt-1">Customers who played</p>
        </motion.div>

        {/* Total Winners */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Winners</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><Award size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalWinners}</h3>
          <p className="text-xs text-slate-400 mt-1">Successful reward claims</p>
        </motion.div>

        {/* Pending Rewards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Status</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{pendingRewards.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Awaiting scratch/fulfillment</p>
        </motion.div>

      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Recent Participation Feed (Left Column - 7/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Smartphone size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Participation Feed</h2>
              <p className="text-xs text-slate-500">Live list of customers who scanned and played.</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {scans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Ticket size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No participations yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">When customers scan your QR and play the scratch card, they will appear here.</p>
              </div>
            ) : (
              scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      scan.status === 'Reward Won' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : scan.status === 'No Win'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {scan.status === 'Reward Won' ? <Gift size={18} /> : scan.status === 'No Win' ? <AlertCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {scan.customer_name || (scan.customer_phone ? `+91 ${scan.customer_phone}` : 'Walk-in Customer')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {scan.prize_won ? `Won: ${scan.prize_won}` : 'No prize claimed'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      scan.status === 'Reward Won' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : scan.status === 'No Win'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {scan.status}
                    </span>
                    <p className="mt-1.5 text-xs text-slate-400">{formatDate(scan.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Winners List (Right Column - 5/12) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Lucky Winners</h2>
              <p className="text-xs text-slate-500">Customers who won a reward at your shop.</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {totalWinners === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
                  <Award size={32} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No winners yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">Keep encouraging customers to scan and play!</p>
              </div>
            ) : (
              scans.filter(scan => scan.status === 'Reward Won').map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7BC142]/15 to-[#1857D6]/15 text-[#3E7A1C]">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {scan.customer_name || (scan.customer_phone ? `+91 ${scan.customer_phone}` : 'Walk-in Customer')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Prize: <span className="font-bold text-[#3E7A1C]">{scan.prize_won || 'Reward'}</span></p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{formatDate(scan.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </div>
  )
}