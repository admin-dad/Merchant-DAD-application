'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket,
  Plus,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  Gift,
  Calendar,
  Percent,
  Hash,
  X,
  CheckCircle2,
  Layers,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  Store,
  Users
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type CampaignType = 'merchant' | 'customer'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  gift_id: string | null
  prize_details: string | null
  winning_probability: number
  total_cards: number
  winning_numbers: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  gifts?: {
    name: string
  }
}

interface GiftItem {
  id: string
  name: string
  status: string
}

interface CampaignStats {
  issued: number
  opened: number
  winners: number
  nonWinners: number
  pendingRewards: number
  claimedRewards: number
}

const TYPE_META: Record<CampaignType, { label: string; icon: typeof Store; badgeClass: string; iconClass: string }> = {
  merchant: {
    label: 'Merchant',
    icon: Store,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    iconClass: 'text-violet-500'
  },
  customer: {
    label: 'Customer',
    icon: Users,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconClass: 'text-blue-500'
  }
}

export default function AdminCampaignsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CampaignType>('all')
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'customer' as CampaignType,
    gift_id: '',
    prize_details: '',
    winning_probability: '0.1',
    total_cards: '1000',
    winning_numbers: '',
    start_date: '',
    end_date: ''
  })

  // Edit Modal State (Fully Editable)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCamp, setEditingCamp] = useState<Campaign | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'customer' as CampaignType,
    gift_id: '',
    prize_details: '',
    winning_probability: '0.1',
    total_cards: '1000',
    winning_numbers: '',
    start_date: '',
    end_date: '',
    status: 'active'
  })

  // ── Fetch Campaigns, Gifts & Stats ─────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const { data: giftData } = await supabase
        .from('gifts')
        .select('id, name, status')
        .eq('status', 'active')
      if (giftData) setGifts(giftData)

      const { data: campData, error: campError } = await supabase
        .from('campaigns')
        .select('*, gifts(name)')
        .order('created_at', { ascending: false })

      if (campError) {
        setError('Failed to load campaigns.')
        setLoading(false)
        return
      }
      setCampaigns(campData as Campaign[])

      const { data: scanData } = await supabase
        .from('qr_scans')
        .select('campaign_id, status, fulfillment_status')

      const tempStats: Record<string, CampaignStats> = {}
      if (scanData) {
        scanData.forEach((scan) => {
          const cId = scan.campaign_id
          if (!cId) return
          
          if (!tempStats[cId]) {
            tempStats[cId] = { issued: 0, opened: 0, winners: 0, nonWinners: 0, pendingRewards: 0, claimedRewards: 0 }
          }
          
          tempStats[cId].issued++
          
          if (scan.status === 'Reward Won') {
            tempStats[cId].opened++
            tempStats[cId].winners++
            if (scan.fulfillment_status === 'Claimed' || scan.fulfillment_status === 'Delivered') {
              tempStats[cId].claimedRewards++
            } else {
              tempStats[cId].pendingRewards++
            }
          } else if (scan.status === 'No Win') {
            tempStats[cId].opened++
            tempStats[cId].nonWinners++
          }
        })
      }
      
      setStatsMap(tempStats)
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // ── Helper: friendly error for the "one active campaign per type" rule ──
  const describeCampaignError = (err: { code?: string; message?: string } | null, type: CampaignType) => {
    if (err?.code === '23505') {
      return `There's already an active ${TYPE_META[type].label.toLowerCase()} campaign. Pause or delete it before activating another one of the same type.`
    }
    return err?.message || 'Something went wrong. Please try again.'
  }

  // ── Handle Create Campaign ───────────────────────────────────────────
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          name: form.name,
          type: form.type,
          gift_id: form.gift_id || null,
          prize_details: form.prize_details || null,
          winning_probability: parseFloat(form.winning_probability),
          total_cards: parseInt(form.total_cards) || 1000,
          winning_numbers: form.winning_numbers || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: 'active'
        }
      ])
      .select('*, gifts(name)')
      .single()

    if (!error && data) {
      setCampaigns(prev => [data as Campaign, ...prev])
      setForm({ name: '', type: 'customer', gift_id: '', prize_details: '', winning_probability: '0.1', total_cards: '1000', winning_numbers: '', start_date: '', end_date: '' })
      setIsModalOpen(false)
    } else {
      setFormError(describeCampaignError(error, form.type))
    }
    setSubmitting(false)
  }

  // ── Handle Edit Click ────────────────────────────────────────────────
  const handleEditClick = (camp: Campaign) => {
    setEditingCamp(camp)
    setEditFormError(null)
    setEditForm({
      name: camp.name,
      type: camp.type || 'customer',
      gift_id: camp.gift_id || '',
      prize_details: camp.prize_details || '',
      winning_probability: String(camp.winning_probability),
      total_cards: String(camp.total_cards),
      winning_numbers: camp.winning_numbers || '',
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      status: camp.status || 'active'
    })
    setIsEditModalOpen(true)
  }

  // ── Handle Update Campaign (Fully Editable) ───────────────────────────
  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCamp) return
    setSubmitting(true)
    setEditFormError(null)

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name: editForm.name,
        type: editForm.type,
        gift_id: editForm.gift_id || null,
        prize_details: editForm.prize_details || null,
        winning_probability: parseFloat(editForm.winning_probability),
        total_cards: parseInt(editForm.total_cards) || 1000,
        winning_numbers: editForm.winning_numbers || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        status: editForm.status
      })
      .eq('id', editingCamp.id)
      .select('*, gifts(name)')
      .single()

    if (!error && data) {
      setCampaigns(prev => prev.map(c => c.id === data.id ? (data as Campaign) : c))
      setIsEditModalOpen(false)
      setEditingCamp(null)
    } else {
      setEditFormError(describeCampaignError(error, editForm.type))
    }
    setSubmitting(false)
  }

  // ── Handle Delete Campaign ───────────────────────────────────────────
  const handleDeleteCampaign = async (campId: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this campaign? This will permanently remove it from the dashboard.')
    if (!confirmDelete) return

    const { error } = await supabase.from('campaigns').delete().eq('id', campId)
    if (!error) {
      setCampaigns(prev => prev.filter(c => c.id !== campId))
    } else {
      alert('Failed to delete campaign.')
    }
  }

  // ── Handle Pause/Activate Shortcut ───────────────────────────────────
  const handleToggleStatus = async (campId: string, currentStatus: string, type: CampaignType) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campId)

    if (!error) {
      setCampaigns(prev => 
        prev.map(c => c.id === campId ? { ...c, status: newStatus } : c)
      )
    } else {
      alert(describeCampaignError(error, type))
    }
  }

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No end date'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || c.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [campaigns, searchQuery, typeFilter])

  // Whether an active campaign already exists for a given type (client-side hint only —
  // the database unique index is the real source of truth)
  const activeTypeMap = useMemo(() => {
    const map: Partial<Record<CampaignType, boolean>> = {}
    campaigns.forEach(c => {
      if (c.status === 'active') map[c.type] = true
    })
    return map
  }, [campaigns])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Ticket size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Campaigns & Scratch Cards
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Wire gifts to campaigns, generate inventory, and manage rules.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setFormError(null); setIsModalOpen(true) }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] cursor-pointer"
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Search & Type Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:p-5 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          {(['all', 'customer', 'merchant'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'all' ? 'All Types' : TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
            <Ticket size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No campaigns found</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">Create a new campaign and attach a gift to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((camp, idx) => {
            const stats = statsMap[camp.id] || { issued: 0, opened: 0, winners: 0, nonWinners: 0, pendingRewards: 0, claimedRewards: 0 }
            const isActive = camp.status === 'active'
            const openedPercentage = stats.issued > 0 ? (stats.opened / stats.issued) * 100 : 0
            const typeMeta = TYPE_META[camp.type] || TYPE_META.customer
            const TypeIcon = typeMeta.icon
            
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm relative group overflow-hidden"
              >
                {/* Actions (Edit/Delete) */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(camp)}
                    className="p-1.5 bg-blue-50 text-[#1857D6] hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Campaign Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 pr-16">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                      <Gift size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{camp.name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeMeta.badgeClass}`}>
                          <TypeIcon size={10} />
                          {typeMeta.label}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#3E7A1C]">
                        Prize: {camp.gifts?.name || 'No specific gift attached'}
                      </p>
                      {camp.prize_details && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{camp.prize_details}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize mt-1 ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full bg-current ${isActive ? 'animate-pulse' : ''}`} />
                    {camp.status}
                  </span>
                </div>

                {/* Scratch Card Inventory Section */}
                <div className="mb-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-slate-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Scratch Card Management</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center mb-3 pb-3 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Generated</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{camp.total_cards}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Issued</p>
                      <p className="text-lg font-bold text-[#1857D6] mt-1">{stats.issued}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Opened</p>
                      <p className="text-lg font-bold text-[#3E7A1C] mt-1">{stats.opened}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center mb-3 pb-3 border-b border-slate-200">
                    <div className="p-2 rounded-lg bg-emerald-50/50">
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Total Winners</p>
                      <p className="text-base font-bold text-slate-900 mt-1">{stats.winners}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50/50">
                      <p className="text-[10px] font-bold uppercase text-rose-600">Non-Winners</p>
                      <p className="text-base font-bold text-slate-900 mt-1">{stats.nonWinners}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-amber-50/50">
                      <p className="text-[10px] font-bold uppercase text-amber-600">Pending Rewards</p>
                      <p className="text-base font-bold text-slate-900 mt-1">{stats.pendingRewards}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50/50">
                      <p className="text-[10px] font-bold uppercase text-blue-600">Claimed</p>
                      <p className="text-base font-bold text-slate-900 mt-1">{stats.claimedRewards}</p>
                    </div>
                  </div>

                  <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${openedPercentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#1857D6] to-[#7BC142]"
                    />
                  </div>
                </div>

                {/* Winning Logic Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Hash size={12} className="text-slate-400" />
                    <span>Win Nos: <span className="font-semibold text-slate-900">{camp.winning_numbers || 'Random'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent size={12} className="text-[#3E7A1C]" />
                    <span>Prob: <span className="font-semibold text-slate-900">{(camp.winning_probability * 100).toFixed(0)}%</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Period: <span className="font-semibold text-slate-900">{formatDate(camp.start_date)} - {formatDate(camp.end_date)}</span></span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleToggleStatus(camp.id, camp.status, camp.type)}
                  className={`mt-auto w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors cursor-pointer border ${
                    isActive 
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  {isActive ? 'Pause Campaign' : 'Activate Campaign'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── CREATE CAMPAIGN MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <div className="mb-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#7BC142]/10 px-3 py-1 text-xs font-semibold text-[#3E7A1C]">
                    <Ticket size={13} />
                    New Campaign
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Create Scratch Card Campaign</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Wire your gifts and set winning logic.</p>
                </div>

                {formError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      placeholder="e.g. Diwali Dhamaka"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['customer', 'merchant'] as const).map(t => {
                        const meta = TYPE_META[t]
                        const Icon = meta.icon
                        const selected = form.type === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setForm({...form, type: t})}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#1857D6] bg-[#1857D6]/5 text-[#1857D6]'
                                : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Icon size={16} className={selected ? 'text-[#1857D6]' : 'text-slate-400'} />
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                    {activeTypeMap[form.type] && (
                      <p className="mt-1.5 text-[11px] text-amber-600">
                        There's already an active {TYPE_META[form.type].label.toLowerCase()} campaign — this one will need to wait until it's paused.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Attach Prize (From Gifts)</label>
                    <div className="relative">
                      <select
                        value={form.gift_id}
                        onChange={(e) => setForm({...form, gift_id: e.target.value})}
                        required
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] cursor-pointer"
                      >
                        <option value="" disabled>Select a Gift Inventory Item...</option>
                        {gifts.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Additional Details (Optional)</label>
                    <input
                      type="text"
                      value={form.prize_details}
                      onChange={(e) => setForm({...form, prize_details: e.target.value})}
                      placeholder="e.g. Extra rules or conditions"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Cards</label>
                      <input
                        type="number"
                        min="1"
                        value={form.total_cards}
                        onChange={(e) => setForm({...form, total_cards: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Win Probability (0-1)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={form.winning_probability}
                        onChange={(e) => setForm({...form, winning_probability: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Winning Numbers (Optional)</label>
                    <input
                      type="text"
                      value={form.winning_numbers}
                      onChange={(e) => setForm({...form, winning_numbers: e.target.value})}
                      placeholder="e.g. 11, 22, 33"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm({...form, start_date: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm({...form, end_date: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer mt-4"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {submitting ? 'Generating...' : 'Generate Campaign'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FULLY EDITABLE EDIT CAMPAIGN MODAL ── */}
      <AnimatePresence>
        {isEditModalOpen && editingCamp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
              
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <div className="mb-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#1857D6]">
                    <Pencil size={13} />
                    Edit Campaign
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Update Campaign Details</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Make changes to any parameter of this campaign.</p>
                </div>

                {editFormError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateCampaign} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['customer', 'merchant'] as const).map(t => {
                        const meta = TYPE_META[t]
                        const Icon = meta.icon
                        const selected = editForm.type === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditForm({...editForm, type: t})}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#1857D6] bg-[#1857D6]/5 text-[#1857D6]'
                                : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Icon size={16} className={selected ? 'text-[#1857D6]' : 'text-slate-400'} />
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Attached Prize</label>
                    <div className="relative">
                      <select
                        value={editForm.gift_id}
                        onChange={(e) => setEditForm({...editForm, gift_id: e.target.value})}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] cursor-pointer"
                      >
                        <option value="">Select a Gift...</option>
                        {gifts.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prize Details</label>
                    <input
                      type="text"
                      value={editForm.prize_details}
                      onChange={(e) => setEditForm({...editForm, prize_details: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Cards</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.total_cards}
                        onChange={(e) => setEditForm({...editForm, total_cards: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Win Probability</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={editForm.winning_probability}
                        onChange={(e) => setEditForm({...editForm, winning_probability: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Winning Numbers</label>
                    <input
                      type="text"
                      value={editForm.winning_numbers}
                      onChange={(e) => setEditForm({...editForm, winning_numbers: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={editForm.start_date}
                        onChange={(e) => setEditForm({...editForm, start_date: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={editForm.end_date}
                        onChange={(e) => setEditForm({...editForm, end_date: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Status</label>
                    <div className="relative">
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer mt-4"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {submitting ? 'Saving...' : 'Save Changes'}
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