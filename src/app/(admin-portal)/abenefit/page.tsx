'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Award,
  Plus,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  Tag,
  Users,
  X,
  CheckCircle2,
  Percent,
  Gift,
  Sparkles,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Benefit {
  id: string
  title: string
  description: string | null
  benefit_type: string
  target_category: string
  status: string
  created_at: string
}

interface Category {
  id: string
  name: string
}

export default function AdminBenefitsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    benefit_type: 'Discount',
    target_category: 'all'
  })

  // ── Fetch Benefits & Categories ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const [benefitsRes, categoriesRes] = await Promise.all([
        supabase
          .from('merchant_benefits')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      ])

      if (benefitsRes.error) {
        setError('Failed to load benefits.')
      } else {
        setBenefits(benefitsRes.data as Benefit[])
      }

      if (!categoriesRes.error && categoriesRes.data) {
        setCategories(categoriesRes.data as Category[])
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // ── Handle Create Benefit ────────────────────────────────────────────
  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { data, error } = await supabase
      .from('merchant_benefits')
      .insert([
        {
          title: form.title,
          description: form.description || null,
          benefit_type: form.benefit_type,
          target_category: form.target_category,
          status: 'active'
        }
      ])
      .select()
      .single()

    if (!error && data) {
      setBenefits(prev => [data as Benefit, ...prev])
      setForm({ title: '', description: '', benefit_type: 'Discount', target_category: 'all' })
      setIsModalOpen(false)
    } else {
      alert('Failed to create benefit.')
    }

    setSubmitting(false)
  }

  // ── Handle Activate/Deactivate ───────────────────────────────────────
  const handleToggleStatus = async (benefitId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('merchant_benefits')
      .update({ status: newStatus })
      .eq('id', benefitId)

    if (!error) {
      setBenefits(prev => 
        prev.map(b => b.id === benefitId ? { ...b, status: newStatus } : b)
      )
    }
  }

  // ── Icon Mapper ──────────────────────────────────────────────────────
  const getBenefitIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'discount': return <Percent size={20} />
      case 'reward points': return <Gift size={20} />
      case 'free service': return <Sparkles size={20} />
      default: return <Tag size={20} />
    }
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
              <Award size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Benefits
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and assign exclusive deals, discounts, and rewards to merchant categories.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] cursor-pointer"
          >
            <Plus size={16} />
            Add Benefit
          </button>
        </div>
      </div>

      {/* Benefits Grid */}
      {benefits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-slate-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
            <Award size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No benefits created yet</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">Add exclusive perks for your merchant partners.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => {
            const isActive = benefit.status === 'active'
            
            return (
              <motion.div
                key={benefit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                {/* Benefit Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7BC142]/10 to-[#1857D6]/10 text-[#1857D6]">
                    {getBenefitIcon(benefit.benefit_type)}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full bg-current ${isActive ? 'animate-pulse' : ''}`} />
                    {benefit.status}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-1 text-xs text-slate-500 flex-1">{benefit.description || 'No description provided.'}</p>

                {/* Meta Info */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" />
                    <span>Type: <span className="font-semibold text-slate-900">{benefit.benefit_type}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" />
                    <span>Target: <span className="font-semibold text-slate-900 capitalize">{benefit.target_category}</span></span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleToggleStatus(benefit.id, benefit.status)}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  {isActive ? 'Deactivate Benefit' : 'Activate Benefit'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Benefit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
                    <Award size={13} />
                    New Benefit
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19] sm:text-[28px]">Create Merchant Benefit</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Define the perk and assign it to a specific merchant category.</p>
                </div>

                <form onSubmit={handleCreateBenefit} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Benefit Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({...form, title: e.target.value})}
                      placeholder="e.g. 20% Off Bulk Purchase"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                      rows={2}
                      placeholder="e.g. Get 20% off on your first bulk order."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Benefit Type</label>
                      <select
                        value={form.benefit_type}
                        onChange={(e) => setForm({...form, benefit_type: e.target.value})}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
                      >
                        <option value="Discount">Discount</option>
                        <option value="Reward Points">Reward Points</option>
                        <option value="Free Service">Free Service</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target Category</label>
                      <select
                        value={form.target_category}
                        onChange={(e) => setForm({...form, target_category: e.target.value})}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name} className="capitalize">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer mt-4"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Create Benefit
                      </>
                    )}
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