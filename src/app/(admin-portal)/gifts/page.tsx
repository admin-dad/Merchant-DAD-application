'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Gift,
  Plus,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  Package,
  IndianRupee,
  X,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  ChevronDown,
  Pencil,
  Trash2,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface GiftItem {
  id: string
  name: string
  description: string | null
  value: number
  total_stock: number
  claimed_count: number
  status: string
  image_url: string | null
  created_at: string
}

export default function AdminGiftsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gifts, setGifts] = useState<GiftItem[]>([])
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    value: '0',
    total_stock: '100',
    image_url: ''
  })

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null)
  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    value: '0',
    total_stock: '0',
    image_url: ''
  })

  // ── Fetch Gifts ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError('Failed to load gifts.')
      } else {
        setGifts(data as GiftItem[])
      }
      setLoading(false)
    }

    fetchGifts()
  }, [supabase])

  // ── Handle Image Upload (Create) ─────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `gift_${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('product-images') // Reusing your existing storage bucket safely
      .upload(fileName, file)

    if (!error) {
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      setForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
    } else {
      alert('Failed to upload image. Ensure storage bucket is configured.')
    }
    setUploadingImage(false)
  }

  // ── Handle Image Upload (Edit) ───────────────────────────────────────
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingEditImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `gift_${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file)

    if (!error) {
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      setEditForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
    } else {
      alert('Failed to upload image.')
    }
    setUploadingEditImage(false)
  }

  // ── Handle Create Gift ───────────────────────────────────────────────
  const handleCreateGift = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { data, error } = await supabase
      .from('gifts')
      .insert([
        {
          name: form.name,
          description: form.description || null,
          value: parseFloat(form.value) || 0,
          total_stock: parseInt(form.total_stock) || 0,
          claimed_count: 0,
          status: 'active',
          image_url: form.image_url || null
        }
      ])
      .select()
      .single()

    if (!error && data) {
      setGifts(prev => [data as GiftItem, ...prev])
      setForm({ name: '', description: '', value: '0', total_stock: '100', image_url: '' })
      setIsModalOpen(false)
    } else {
      alert('Failed to create gift.')
    }

    setSubmitting(false)
  }

  // ── Handle Edit Click ────────────────────────────────────────────────
  const handleEditClick = (gift: GiftItem) => {
    setEditingGift(gift)
    setEditForm({
      name: gift.name,
      description: gift.description || '',
      value: String(gift.value),
      total_stock: String(gift.total_stock),
      image_url: gift.image_url || ''
    })
    setIsEditModalOpen(true)
  }

  // ── Handle Update Gift ───────────────────────────────────────────────
  const handleUpdateGift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGift) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('gifts')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        value: parseFloat(editForm.value) || 0,
        total_stock: parseInt(editForm.total_stock) || 0,
        image_url: editForm.image_url || null
      })
      .eq('id', editingGift.id)
      .select()
      .single()

    if (!error && data) {
      setGifts(prev => prev.map(g => g.id === data.id ? (data as GiftItem) : g))
      setIsEditModalOpen(false)
      setEditingGift(null)
    } else {
      alert('Failed to update gift.')
    }

    setSubmitting(false)
  }

  // ── Handle Delete Gift ───────────────────────────────────────────────
  const handleDeleteGift = async (giftId: string, claimedCount: number) => {
    if (claimedCount > 0) {
      const confirmForce = confirm('Customers have already claimed this gift! Deleting it may cause tracking issues. Are you sure?')
      if (!confirmForce) return
    } else {
      const confirmDelete = confirm('Are you sure you want to delete this gift?')
      if (!confirmDelete) return
    }

    const { error } = await supabase.from('gifts').delete().eq('id', giftId)

    if (!error) {
      setGifts(prev => prev.filter(g => g.id !== giftId))
    } else {
      alert('Failed to delete gift.')
    }
  }

  // ── Handle Activate/Deactivate ───────────────────────────────────────
  const handleToggleStatus = async (giftId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('gifts')
      .update({ status: newStatus })
      .eq('id', giftId)

    if (!error) {
      setGifts(prev => 
        prev.map(g => g.id === giftId ? { ...g, status: newStatus } : g)
      )
    }
  }

  // ── Filter & Search Logic ────────────────────────────────────────────
  const filteredGifts = useMemo(() => {
    return gifts.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (g.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesStatus = statusFilter === 'All' || g.status === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [gifts, searchQuery, statusFilter])

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
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Gift size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Gifts & Prize Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and manage the reward inventory available for scratch card campaigns.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] cursor-pointer"
          >
            <Plus size={18} />
            Add Gift
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search gifts by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 hidden sm:flex">
            <Filter size={16} /> Filters:
          </div>
          <div className="relative min-w-[140px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Gifts Grid */}
      {filteredGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
            <Gift size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No gifts found</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">Adjust your search filters or add a new gift.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGifts.map((gift, idx) => {
            const isActive = gift.status === 'active'
            const claimedPercentage = gift.total_stock > 0 ? (gift.claimed_count / gift.total_stock) * 100 : 0
            const remainingStock = Math.max(0, gift.total_stock - gift.claimed_count)
            
            return (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm relative group overflow-hidden"
              >
                {/* Actions (Edit/Delete) - Top Right */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(gift)}
                    className="p-1.5 bg-white/90 text-[#1857D6] hover:bg-white rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteGift(gift.id, gift.claimed_count)}
                    className="p-1.5 bg-white/90 text-rose-600 hover:bg-white rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Gift Image or Icon Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/60 shadow-sm">
                    {gift.image_url ? (
                      <img src={gift.image_url} alt={gift.name} className="h-full w-full object-cover" />
                    ) : (
                      <Gift size={24} className="text-[#1857D6]" />
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize mt-1 mr-16 ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full bg-current ${isActive ? 'animate-pulse' : ''}`} />
                    {gift.status}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900 pr-12">{gift.name}</h3>
                <p className="mt-1 text-xs text-slate-500 flex-1 line-clamp-2">{gift.description || 'No description provided.'}</p>

                {/* Value Tag */}
                <div className="mt-3 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <IndianRupee size={14} className="text-[#3E7A1C]" />
                  {Number(gift.value).toFixed(2)}
                  <span className="text-xs font-medium text-slate-400 ml-1">Value</span>
                </div>

                {/* Inventory Section */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={12} className="text-slate-600" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-700">Inventory Status</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{gift.total_stock}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Claimed</p>
                      <p className="text-sm font-bold text-[#1857D6] mt-0.5">{gift.claimed_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Left</p>
                      <p className="text-sm font-bold text-[#3E7A1C] mt-0.5">{remainingStock}</p>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(claimedPercentage, 100)}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#1857D6] to-[#7BC142]"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(gift.id, gift.status)}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors cursor-pointer border ${
                    isActive 
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  {isActive ? 'Pause Gift' : 'Activate Gift'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── CREATE GIFT MODAL ── */}
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
                    <Gift size={13} />
                    New Prize
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Create New Gift</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Define the prize details, image, and available stock.</p>
                </div>

                <form onSubmit={handleCreateGift} className="space-y-4">
                  {/* Image Upload Area */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gift Image (Optional)</label>
                    <div className="group relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                        disabled={uploadingImage || submitting}
                      />
                      {form.image_url ? (
                        <>
                          <img src={form.image_url} alt="Preview" className="h-full w-full object-contain p-2" />
                          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                              <UploadCloud size={14} /> Change Image
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          {uploadingImage ? (
                            <>
                              <Loader2 size={24} className="animate-spin text-[#1857D6]" />
                              <span className="text-xs font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
                                <ImageIcon size={20} className="text-slate-400" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">Click to upload image</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gift Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      placeholder="e.g. ₹100 Cashback or Laptop"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                      rows={2}
                      placeholder="e.g. Direct cashback to customer wallet"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Value (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.value}
                        onChange={(e) => setForm({...form, value: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Stock</label>
                      <input
                        type="number"
                        min="1"
                        value={form.total_stock}
                        onChange={(e) => setForm({...form, total_stock: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer mt-4"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {submitting ? 'Saving...' : 'Create Gift'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT GIFT MODAL ── */}
      <AnimatePresence>
        {isEditModalOpen && editingGift && (
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
                    Edit Prize
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Update Gift</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Modify details, image, or stock.</p>
                </div>

                <form onSubmit={handleUpdateGift} className="space-y-4">
                  {/* Image Edit Area */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gift Image</label>
                    <div className="group relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleEditImageUpload} 
                        className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                        disabled={uploadingEditImage || submitting}
                      />
                      {editForm.image_url ? (
                        <>
                          <img src={editForm.image_url} alt="Preview" className="h-full w-full object-contain p-2" />
                          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                              <UploadCloud size={14} /> Change Image
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          {uploadingEditImage ? (
                            <>
                              <Loader2 size={24} className="animate-spin text-[#1857D6]" />
                              <span className="text-xs font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
                                <ImageIcon size={20} className="text-slate-400" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">Click to upload image</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gift Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Value (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.value}
                        onChange={(e) => setEditForm({...editForm, value: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Stock</label>
                      <input
                        type="number"
                        min={editingGift.claimed_count}
                        value={editForm.total_stock}
                        onChange={(e) => setEditForm({...editForm, total_stock: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Must be at least {editingGift.claimed_count} (already claimed)
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploadingEditImage}
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