'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Truck,
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
  Percent,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types (Matching your exact Supabase schema)
// ─────────────────────────────────────────────────────────────────────────
interface Vendor {
  id: string
  store_name: string
  owner_name: string
  mobile: string
  email: string
  commission_rate: string | number // Handling string/numeric from DB
  status: string
  created_at: string
}

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function AdminVendorsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── Fetch Vendors ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('vendors')
        .select('id, store_name, owner_name, mobile, email, commission_rate, status, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        setError('Failed to load vendors.')
      } else {
        setVendors(data as Vendor[])
      }
      setLoading(false)
    }

    fetchVendors()
  }, [supabase])

  // ── Handle Approve / Reject / Suspend ────────────────────────────────
  const handleUpdateStatus = async (vendorId: string, newStatus: string) => {
    setUpdatingId(vendorId)
    
    const { error } = await supabase
      .from('vendors')
      .update({ status: newStatus })
      .eq('id', vendorId)

    if (!error) {
      setVendors(prev => 
        prev.map(v => v.id === vendorId ? { ...v, status: newStatus } : v)
      )
    } else {
      alert('Failed to update status.')
    }
    
    setUpdatingId(null)
  }

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      v.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.mobile.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Truck size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Vendor / Seller Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Approve sellers, manage commissions, and oversee e-commerce supply.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by store, owner, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
        
        <div className="relative w-full md:w-auto">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Truck size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registered Vendors</h2>
            <p className="text-xs text-slate-500">Showing {filteredVendors.length} of {vendors.length} vendors.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Store / Owner</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Contact Info</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Commission</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No vendors found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => {
                  // Normalize status for UI display
                  const displayStatus = v.status === 'active' ? 'approved' : v.status;
                  const commRate = Number(v.commission_rate || 0);

                  return (
                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {/* Business Info */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900">{v.store_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(v.created_at)} • {v.owner_name}
                        </p>
                      </td>
                      
                      {/* Contact */}
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <p className="text-slate-700 flex items-center gap-1.5"><Phone size={12} /> {v.mobile}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail size={12} /> {v.email || 'N/A'}</p>
                      </td>
                      
                      {/* Commission */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Percent size={12} className="text-[#3E7A1C]" />
                          {commRate}%
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[displayStatus] || statusStyles.pending}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {displayStatus}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {updatingId === v.id ? (
                            <Loader2 size={16} className="animate-spin text-[#1857D6]" />
                          ) : (
                            <>
                              {/* Approve Button */}
                              {displayStatus !== 'approved' && (
                                <button 
                                  onClick={() => handleUpdateStatus(v.id, 'approved')}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Approve Vendor"
                                >
                                  <CheckCircle2 size={14} />
                                  <span className="hidden sm:inline">Approve</span>
                                </button>
                              )}
                              
                              {/* Suspend Button */}
                              {displayStatus !== 'suspended' && (
                                <button 
                                  onClick={() => handleUpdateStatus(v.id, 'suspended')}
                                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Suspend Vendor"
                                >
                                  <Ban size={14} />
                                  <span className="hidden sm:inline">Suspend</span>
                                </button>
                              )}

                              {/* Reject Button */}
                              {displayStatus !== 'rejected' && (
                                <button 
                                  onClick={() => handleUpdateStatus(v.id, 'rejected')}
                                  className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Reject Vendor"
                                >
                                  <XCircle size={14} />
                                  <span className="hidden sm:inline">Reject</span>
                                </button>
                              )}
                            </>
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
    </div>
  )
}