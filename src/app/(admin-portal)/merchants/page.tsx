'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  AlertCircle,
  Filter,
  Phone,
  Mail,
  Calendar,
  Eye,
  X,
  MapPin,
  FileText,
  User,
  Tag,
  Gift,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant {
  id: string
  business_name: string
  owner_name: string
  mobile: string
  email: string | null
  category: string
  sub_category: string | null
  address: string | null
  gst: string | null
  pan: string | null
  status: string
  created_at: string
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function AdminMerchantsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([])

  // View Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── Fetch Merchants ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, business_name, owner_name, mobile, email, category, sub_category, address, gst, pan, status, created_at')
        .order('created_at', { ascending: false })

      if (merchantsError) {
        setError('Failed to load data.')
        setLoading(false)
        return
      }
      setMerchants(merchantsData as Merchant[])

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // ── Handle Approve / Reject / Suspend ────────────────────────────────
  const handleUpdateStatus = async (merchantId: string, newStatus: string) => {
    setUpdatingId(merchantId)

    const { error } = await supabase
      .from('merchants')
      .update({ status: newStatus })
      .eq('id', merchantId)

    if (!error) {
      setMerchants(prev =>
        prev.map(m => m.id === merchantId ? { ...m, status: newStatus } : m)
      )
      if (selectedMerchant?.id === merchantId) {
        setSelectedMerchant(prev => prev ? { ...prev, status: newStatus } : prev)
      }
    } else {
      alert('Failed to update status.')
    }

    setUpdatingId(null)
  }

  const filteredMerchants = merchants.filter(m => {
    const matchesSearch =
      m.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mobile.includes(searchQuery)

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Store size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Approve, reject, or suspend registered merchants.
              </p>
            </div>
          </div>

          <Link
            href="/merchant-scratch-cards"
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors shadow-purple-500/20"
          >
            <Gift size={16} />
            Manage Scratch Cards
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>

        <div className="relative w-full md:w-auto">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-8 py-2.5 text-sm font-medium text-slate-900 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved / Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Merchants Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Registered Merchants</h2>
              <p className="text-xs text-slate-500">Showing {filteredMerchants.length} of {merchants.length} merchants.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Business / Owner</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Contact</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Category</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
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
                  const displayStatus = m.status === 'active' ? 'approved' : m.status;

                  return (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900">{m.business_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(m.created_at)} • {m.owner_name}
                        </p>
                      </td>

                      <td className="py-4 px-4 hidden lg:table-cell">
                        <p className="text-slate-700 flex items-center gap-1.5"><Phone size={12} /> {m.mobile}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail size={12} /> {m.email || 'N/A'}</p>
                      </td>

                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="text-slate-600">{m.category}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[displayStatus] || statusStyles.pending}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {displayStatus}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <button
                            onClick={() => {
                              setSelectedMerchant(m)
                              setIsModalOpen(true)
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          <div className="mx-1 h-5 w-px bg-slate-200" />

                          {/* Status actions */}
                          {updatingId === m.id ? (
                            <div className="flex h-8 w-[92px] items-center justify-center">
                              <Loader2 size={16} className="animate-spin text-[#1857D6]" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/60 p-0.5">
                              {displayStatus !== 'approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(m.id, 'approved')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
                                  title="Approve Merchant"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {displayStatus !== 'suspended' && (
                                <button
                                  onClick={() => handleUpdateStatus(m.id, 'suspended')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                                  title="Suspend Merchant"
                                >
                                  <Ban size={14} />
                                </button>
                              )}
                              {displayStatus !== 'rejected' && (
                                <button
                                  onClick={() => handleUpdateStatus(m.id, 'rejected')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Reject Merchant"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* View Merchant Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedMerchant && (
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
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#1857D6]">
                    <Store size={13} />
                    Merchant Details
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">{selectedMerchant.business_name}</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Registered on {formatDate(selectedMerchant.created_at)}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <DetailItem icon={<User size={14} />} label="Owner Name" value={selectedMerchant.owner_name} />
                  <DetailItem icon={<Phone size={14} />} label="Mobile Number" value={selectedMerchant.mobile} />
                  <DetailItem icon={<Mail size={14} />} label="Email Address" value={selectedMerchant.email || 'N/A'} />
                  <DetailItem icon={<Tag size={14} />} label="Category" value={selectedMerchant.category} />
                  <DetailItem icon={<Tag size={14} />} label="Sub-Category" value={selectedMerchant.sub_category || 'N/A'} />
                  <DetailItem icon={<FileText size={14} />} label="GST Number" value={selectedMerchant.gst || 'N/A'} />
                  <DetailItem icon={<FileText size={14} />} label="PAN Number" value={selectedMerchant.pan || 'N/A'} />
                  <div className="sm:col-span-2">
                    <DetailItem icon={<MapPin size={14} />} label="Business Address" value={selectedMerchant.address || 'N/A'} />
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Status</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[selectedMerchant.status === 'active' ? 'approved' : selectedMerchant.status] || statusStyles.pending}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    {selectedMerchant.status === 'active' ? 'approved' : selectedMerchant.status}
                  </span>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedMerchant.status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedMerchant.id, 'approved')}
                        disabled={updatingId === selectedMerchant.id}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {updatingId === selectedMerchant.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve
                      </button>
                    )}

                    {selectedMerchant.status !== 'suspended' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedMerchant.id, 'suspended')}
                        disabled={updatingId === selectedMerchant.id}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {updatingId === selectedMerchant.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                        Suspend
                      </button>
                    )}

                    {selectedMerchant.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedMerchant.id, 'rejected')}
                        disabled={updatingId === selectedMerchant.id}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {updatingId === selectedMerchant.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        <span className="text-[#1857D6]">{icon}</span>
        {label}
      </label>
      <p className="text-sm text-slate-800 break-words">{value}</p>
    </div>
  )
}