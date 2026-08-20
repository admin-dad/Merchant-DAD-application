'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  Search,
  Loader2,
  AlertCircle,
  Gift,
  Send,
  Activity,
  X,
  ArrowLeft,
  List
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant {
  id: string
  business_name: string
  owner_name: string
  mobile: string
  category: string
  status: string
  created_at: string
}

interface RewardHistory {
  id: string
  merchant_id: string
  prize_type: string
  prize_amount: number
  winning_probability: number
  status: string
  created_at: string
}

export default function AdminMerchantScratchCardsPage() {
  const supabase = createClient()

  // Tab State
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [rewardsHistory, setRewardsHistory] = useState<RewardHistory[]>([])

  // Bulk Selection State
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Send Scratch Card Modal State
  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false)
  const [scratchTargets, setScratchTargets] = useState<Merchant[]>([])
  const [scratchForm, setScratchForm] = useState({ prize_type: 'points', prize_amount: '50', winning_probability: '1.0' })
  const [sendingCard, setSendingCard] = useState(false)

  // ── Fetch Merchants & Rewards History ────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, business_name, owner_name, mobile, category, status, created_at')
        .order('created_at', { ascending: false })

      if (merchantsError) {
        setError('Failed to load data.')
        setLoading(false)
        return
      }
      setMerchants(merchantsData as Merchant[])

      const { data: rewardsData, error: rewardsError } = await supabase
        .from('merchant_scratch_cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (!rewardsError && rewardsData) {
        setRewardsHistory(rewardsData as RewardHistory[])
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // ── Eligibility & Filtering ───────────────────────────────────────────
  const isEligibleForReward = (status: string) => status === 'active' || status === 'approved'

  const filteredMerchants = merchants.filter(m =>
    m.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.mobile.includes(searchQuery)
  )

  const eligibleFilteredMerchants = filteredMerchants.filter(m => isEligibleForReward(m.status))

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMerchantIds(eligibleFilteredMerchants.map(m => m.id))
    } else {
      setSelectedMerchantIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedMerchantIds(prev =>
      prev.includes(id) ? prev.filter(merchantId => merchantId !== id) : [...prev, id]
    )
  }

  // ── Handle Send Scratch Card (Single or Bulk) ────────────────────────
  const handleSendScratchCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (scratchTargets.length === 0) return
    setSendingCard(true)

    const payloads = scratchTargets.map(target => ({
      merchant_id: target.id,
      prize_type: 'points',
      prize_amount: parseFloat(scratchForm.prize_amount) || 0,
      winning_probability: parseFloat(scratchForm.winning_probability) || 1.0,
      status: 'pending'
    }))

    const { data, error } = await supabase
      .from('merchant_scratch_cards')
      .insert(payloads)
      .select()

    if (!error) {
      alert(`Successfully sent scratch cards to ${scratchTargets.length} merchant(s)!`)
      if (data && data.length > 0) {
        setRewardsHistory(prev => [...(data as RewardHistory[]), ...prev])
      }
      setIsScratchModalOpen(false)
      setScratchTargets([])
      setSelectedMerchantIds([])
      // Switch to history tab to see the newly sent cards
      setActiveTab('history')
    } else {
      alert('Failed to send scratch cards.')
    }
    setSendingCard(false)
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
        <h2 className="text-xl font-semibold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#9333EA]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#9333EA] to-[#6B21A8] text-white shadow-lg shadow-purple-500/20">
              <Gift size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Scratch Cards
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Send B2B reward points and track scratch card activity.
              </p>
            </div>
          </div>

          <Link
            href="/merchants"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Merchants
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 inline-flex w-full sm:w-auto rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'send'
              ? 'bg-purple-50 text-purple-700'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Send size={16} />
          Send Cards
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-purple-50 text-purple-700'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Activity size={16} />
          Activity History
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'send' ? (
          <motion.div
            key="send-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Bar */}
            <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
              <div className="relative w-full">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, mobile, or business..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                />
              </div>
            </div>

            {/* Merchant Selection Table */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Store size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Select Merchants</h2>
                    <p className="text-xs text-slate-500">Only approved / active merchants are eligible for rewards.</p>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedMerchantIds.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        const targets = merchants.filter(m => selectedMerchantIds.includes(m.id))
                        setScratchTargets(targets)
                        setIsScratchModalOpen(true)
                      }}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors shadow-purple-500/20"
                    >
                      <Gift size={16} />
                      Send Rewards ({selectedMerchantIds.length})
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          checked={eligibleFilteredMerchants.length > 0 && selectedMerchantIds.length === eligibleFilteredMerchants.length}
                          onChange={handleSelectAll}
                          disabled={eligibleFilteredMerchants.length === 0}
                          title={eligibleFilteredMerchants.length === 0 ? "No eligible merchants to select" : "Select all eligible merchants"}
                        />
                      </th>
                      <th className="py-3 px-4 font-medium">Business / Owner</th>
                      <th className="py-3 px-4 font-medium hidden md:table-cell">Category</th>
                      <th className="py-3 px-4 font-medium text-center">Cards Sent</th>
                      <th className="py-3 px-4 font-medium text-right">Send</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          No merchants found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((m) => {
                        const isEligible = isEligibleForReward(m.status)
                        const cardsSentCount = rewardsHistory.filter(r => r.merchant_id === m.id).length

                        return (
                          <tr key={m.id} className={`border-b border-slate-50 transition-colors ${selectedMerchantIds.includes(m.id) ? 'bg-purple-50/30' : 'hover:bg-slate-50/50'}`}>
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                checked={selectedMerchantIds.includes(m.id)}
                                onChange={() => handleSelectOne(m.id)}
                                disabled={!isEligible}
                                title={!isEligible ? "Merchant must be approved to receive rewards" : "Select merchant"}
                              />
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-semibold text-slate-900">{m.business_name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{m.owner_name} • {m.mobile}</p>
                            </td>
                            <td className="py-4 px-4 hidden md:table-cell">
                              <span className="text-slate-600">{m.category}</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {cardsSentCount > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                  {cardsSentCount}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => {
                                    if (!isEligible) return
                                    setScratchTargets([m])
                                    setIsScratchModalOpen(true)
                                  }}
                                  disabled={!isEligible}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isEligible
                                      ? 'text-purple-500 hover:bg-purple-50 hover:text-purple-700 cursor-pointer'
                                      : 'text-slate-300 cursor-not-allowed'
                                    }`}
                                  title={isEligible ? 'Send B2B Scratch Card' : 'Merchant must be approved to receive rewards'}
                                >
                                  <Gift size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Scratch Card Activity / Rewards History Section */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Scratch Card Activity</h2>
                    <p className="text-xs text-slate-500">Track all reward points sent to merchants.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[120px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Cards Sent</span>
                    <span className="text-lg font-bold text-slate-900">{rewardsHistory.length}</span>
                  </div>
                  <div className="flex flex-col justify-center px-4 py-2 bg-purple-50/50 rounded-xl border border-purple-100 min-w-[120px]">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Total Points</span>
                    <span className="text-lg font-bold text-purple-700">
                      {rewardsHistory.reduce((acc, curr) => acc + (curr.prize_amount || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-3 px-4 font-medium">Date Sent</th>
                      <th className="py-3 px-4 font-medium">Merchant</th>
                      <th className="py-3 px-4 font-medium">Reward Prize</th>
                      <th className="py-3 px-4 font-medium">Win Probability</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          No scratch cards have been sent yet.
                        </td>
                      </tr>
                    ) : (
                      rewardsHistory.map((reward) => {
                        const merchantInfo = merchants.find(m => m.id === reward.merchant_id)

                        return (
                          <tr key={reward.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 text-slate-600">
                              {formatDate(reward.created_at)}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-900">
                                {merchantInfo?.business_name || 'Unknown Merchant'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                                <Gift size={14} />
                                {reward.prize_amount} Pts
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-600">
                              {(reward.winning_probability * 100).toFixed(0)}% Chance
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${reward.status === 'won' || reward.status === 'claimed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : reward.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                {reward.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Scratch Card Modal */}
      <AnimatePresence>
        {isScratchModalOpen && scratchTargets.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsScratchModalOpen(false)} className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="relative z-10 w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#7BC142]" />
              <button onClick={() => setIsScratchModalOpen(false)} className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={20} /></button>
              <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <div className="mb-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600"><Gift size={13} />Send B2B Scratch Card</div>
                  <h2 className="text-xl font-semibold text-[#0B0F19]">
                    {scratchTargets.length === 1 ? `Reward ${scratchTargets[0].business_name}` : `Reward ${scratchTargets.length} Merchants`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {scratchTargets.length === 1 ? 'The merchant will see this on their dashboard.' : 'Each selected merchant will receive this reward on their dashboard.'}
                  </p>
                </div>
                <form onSubmit={handleSendScratchCard} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Prize Type</label>
                    <select
                      disabled
                      value={scratchForm.prize_type}
                      onChange={(e) => setScratchForm({ ...scratchForm, prize_type: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    >
                      <option value="points">Reward Points</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Points Amount</label>
                      <input
                        type="number"
                        min="1"
                        value={scratchForm.prize_amount}
                        onChange={(e) => setScratchForm({ ...scratchForm, prize_amount: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Win Probability (0-1)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={scratchForm.winning_probability}
                        onChange={(e) => setScratchForm({ ...scratchForm, winning_probability: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={sendingCard} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7BC142] px-7 py-3 text-sm font-semibold text-white shadow-md hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer mt-2">
                    {sendingCard ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send {scratchTargets.length > 1 ? 'Rewards' : 'Reward'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}