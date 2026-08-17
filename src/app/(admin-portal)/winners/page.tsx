'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket,
  Search,
  Loader2,
  AlertCircle,
  Phone,
  Store,
  Gift,
  Clock,
  CheckCircle2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface ScanRecord {
  id: string
  customer_name: string | null
  customer_phone: string | null
  status: string // 'Reward Won', 'No Win', 'Pending'
  prize_won: string | null
  fulfillment_status: string // 'Pending', 'Verified', 'Dispatched', 'Delivered', 'Claimed', 'Rejected'
  created_at: string
  merchant_id: string
}

interface Merchant {
  id: string
  business_name: string
}

const fulfillmentStatusStyles: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Verified: 'bg-blue-50 text-blue-700 border-blue-200',
  Dispatched: 'bg-purple-50 text-purple-700 border-purple-200',
  Delivered: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Claimed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const FULFILLMENT_OPTIONS = ['Pending', 'Verified', 'Dispatched', 'Delivered', 'Claimed', 'Rejected']

export default function AdminWinnersPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({})
  
  // Stats
  const [stats, setStats] = useState({
    totalIssued: 0,
    totalOpened: 0,
    totalWinners: 0,
    pendingFulfillment: 0,
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── Fetch Scans & Merchants ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        const [scansRes, merchRes] = await Promise.all([
          supabase.from('qr_scans').select('*').order('created_at', { ascending: false }),
          supabase.from('merchants').select('id, business_name')
        ])

        if (scansRes.error) throw scansRes.error

        const scanData = scansRes.data as ScanRecord[]
        const merchData = merchRes.data as Merchant[]
        
        const map: Record<string, string> = {}
        merchData.forEach(m => map[m.id] = m.business_name)
        setMerchantMap(map)

        setScans(scanData)

        // Calculate Stats
        const winners = scanData.filter(s => s.status === 'Reward Won')
        const opened = scanData.filter(s => s.status === 'Reward Won' || s.status === 'No Win')
        const pendingFulfill = winners.filter(s => !s.fulfillment_status || s.fulfillment_status === 'Pending')
        
        setStats({
          totalIssued: scanData.length,
          totalOpened: opened.length,
          totalWinners: winners.length,
          pendingFulfillment: pendingFulfill.length,
        })

      } catch (err) {
        setError('Failed to load scratch card data.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // ── Handle Fulfillment Status Update ─────────────────────────────────
  const handleUpdateFulfillment = async (scanId: string, newStatus: string) => {
    setUpdatingId(scanId)
    
    const { error } = await supabase
      .from('qr_scans')
      .update({ fulfillment_status: newStatus })
      .eq('id', scanId)

    if (!error) {
      setScans(prev => 
        prev.map(s => s.id === scanId ? { ...s, fulfillment_status: newStatus } : s)
      )
      
      // Recalculate pending stats
      if (newStatus !== 'Pending') {
        setStats(prev => ({ ...prev, pendingFulfillment: Math.max(0, prev.pendingFulfillment - 1) }))
      }
    } else {
      alert('Failed to update status.')
    }
    
    setUpdatingId(null)
  }

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredScans = scans.filter(s => {
    const matchesSearch = 
      s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_phone?.includes(searchQuery) ||
      merchantMap[s.merchant_id]?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || s.fulfillment_status === statusFilter || (statusFilter === 'Pending' && !s.fulfillment_status)
    
    return matchesSearch && matchesStatus
  })

  // ── Format Date Helper ──────────────────────────────────────────────
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
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
                Scratch Card & Winner Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track issued cards, verify winners, and manage prize fulfillment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Issued</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Ticket size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalIssued}</h3>
          <p className="text-xs text-slate-400 mt-1">Cards generated via QR</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Opened</span>
            <div className="p-2 bg-slate-100 rounded-lg"><CheckCircle2 size={16} className="text-slate-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalOpened}</h3>
          <p className="text-xs text-slate-400 mt-1">Customers who played</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Winners</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><Gift size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalWinners}</h3>
          <p className="text-xs text-slate-400 mt-1">Successful reward claims</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Fulfillment</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.pendingFulfillment}</h3>
          <p className="text-xs text-slate-400 mt-1">Awaiting dispatch/delivery</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone or merchant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
        
        <div className="relative w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-52 appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
          >
            <option value="all">All Fulfillment Status</option>
            {FULFILLMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Scratch Cards Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Gift size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Prize Fulfillment Ledger</h2>
            <p className="text-xs text-slate-500">Update the delivery status for winning customers.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Customer / Merchant</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Prize Won</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Date</th>
                <th className="py-3 px-4 font-medium">Fulfillment Status</th>
                <th className="py-3 px-4 font-medium text-right">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No scratch cards found.
                  </td>
                </tr>
              ) : (
                filteredScans.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Customer / Merchant */}
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-900">
                        {s.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Phone size={10} className="text-slate-400" />
                        {s.customer_phone ? `+91 ${s.customer_phone}` : 'Phone not provided'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Store size={10} />
                        {merchantMap[s.merchant_id] || 'Unknown Merchant'}
                      </p>
                    </td>
                    
                    {/* Prize */}
                    <td className="py-4 px-4 hidden md:table-cell">
                      {s.status === 'Reward Won' ? (
                        <span className="flex items-center gap-1.5 font-semibold text-[#3E7A1C]">
                          <Gift size={12} />
                          {s.prize_won || 'Reward'}
                        </span>
                      ) : (
                        <span className="text-slate-400 capitalize">{s.status}</span>
                      )}
                    </td>
                    
                    {/* Date */}
                    <td className="py-4 px-4 text-slate-500 hidden lg:table-cell">
                      {formatDate(s.created_at)}
                    </td>
                    
                    {/* Current Status */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${fulfillmentStatusStyles[s.fulfillment_status || 'Pending'] || fulfillmentStatusStyles.Pending}`}>
                        {s.fulfillment_status || 'Pending'}
                      </span>
                    </td>
                    
                    {/* Update Action */}
                    <td className="py-4 px-4 text-right">
                      {s.status === 'Reward Won' ? (
                        <div className="flex items-center justify-end gap-2">
                          {updatingId === s.id ? (
                            <Loader2 size={16} className="animate-spin text-[#1857D6]" />
                          ) : (
                            <select
                              value={s.fulfillment_status || 'Pending'}
                              onChange={(e) => handleUpdateFulfillment(s.id, e.target.value)}
                              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
                            >
                              {FULFILLMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}