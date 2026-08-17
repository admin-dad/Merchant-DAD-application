'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  Phone,
  Store,
  Trophy,
  Calendar,
  TrendingUp,
  UserPlus,
  User,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface CustomerRecord {
  phone: string
  name: string | null
  totalScans: number
  rewardsWon: number
  lastActive: string
  merchantId: string
  merchantName: string
  isNew: boolean
}

export default function AdminCustomersPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  
  // Stats
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [newCustomers, setNewCustomers] = useState(0)
  const [totalWinners, setTotalWinners] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch & Aggregate Customer Data ──────────────────────────────────
  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true)
      
      try {
        // Fetch all scans including customer_name to aggregate customer data
        const { data: scanData, error: scanError } = await supabase
          .from('qr_scans')
          .select('id, customer_name, customer_phone, status, created_at, merchant_id')
          .not('customer_phone', 'is', null)
          .order('created_at', { ascending: false })

        if (scanError) throw scanError

        // Fetch merchants to map names
        const { data: merchData } = await supabase
          .from('merchants')
          .select('id, business_name')

        const merchantMap = new Map(merchData?.map(m => [m.id, m.business_name]) || [])

        // Aggregate by phone number
        const customerMap = new Map<string, CustomerRecord>()
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        let winnersCount = 0
        let newCount = 0

        scanData?.forEach(scan => {
          const phone = scan.customer_phone
          if (!phone) return

          if (!customerMap.has(phone)) {
            const isNew = new Date(scan.created_at) >= sevenDaysAgo
            if (isNew) newCount++
            
            customerMap.set(phone, {
              phone: phone,
              name: scan.customer_name || null,
              totalScans: 1,
              rewardsWon: scan.status === 'Reward Won' ? 1 : 0,
              lastActive: scan.created_at,
              merchantId: scan.merchant_id,
              merchantName: merchantMap.get(scan.merchant_id) || 'Unknown Merchant',
              isNew: isNew
            })
          } else {
            const cust = customerMap.get(phone)!
            cust.totalScans++
            if (scan.status === 'Reward Won') cust.rewardsWon++
            // Keep latest name if available
            if (scan.customer_name && !cust.name) {
              cust.name = scan.customer_name
            }
            if (new Date(scan.created_at) > new Date(cust.lastActive)) {
              cust.lastActive = scan.created_at
            }
          }

          if (scan.status === 'Reward Won') winnersCount++
        })

        const customerArray = Array.from(customerMap.values())
        setCustomers(customerArray)
        setTotalCustomers(customerArray.length)
        setNewCustomers(newCount)
        setTotalWinners(winnersCount)

      } catch (err) {
        setError('Failed to load customer data.')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerData()
  }, [supabase])

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredCustomers = customers.filter(c => 
    c.phone.includes(searchQuery) || 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              <Users size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Customer Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track walk-in customers, scan history, and reward claims across the platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Customers</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Users size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalCustomers}</h3>
          <p className="text-xs text-slate-400 mt-1">Unique phone numbers</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Customers</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><UserPlus size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{newCustomers}</h3>
          <p className="text-xs text-slate-400 mt-1">Joined in last 7 days</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Winners</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Trophy size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalWinners}</h3>
          <p className="text-xs text-slate-400 mt-1">Successful reward claims</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or merchant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registered Customers</h2>
            <p className="text-xs text-slate-500">Showing {filteredCustomers.length} customers.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Customer Details</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Engaged Merchant</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Total Scans</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Rewards Won</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Last Active</th>
                <th className="py-3 px-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.phone} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Customer Details (Name & Phone) */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {c.name ? c.name : 'Walk-in Customer'}
                        </p>
                        {c.isNew && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Phone size={11} className="text-slate-400" />
                        +91 {c.phone}
                      </p>
                    </td>
                    
                    {/* Merchant */}
                    <td className="py-4 px-4 hidden md:table-cell">
                      <p className="text-slate-700 flex items-center gap-1.5">
                        <Store size={12} className="text-slate-400" />
                        {c.merchantName}
                      </p>
                    </td>
                    
                    {/* Total Scans */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <TrendingUp size={12} className="text-slate-400" />
                        {c.totalScans}
                      </span>
                    </td>
                    
                    {/* Rewards Won */}
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Trophy size={12} className="text-amber-500" />
                        {c.rewardsWon}
                      </span>
                    </td>
                    
                    {/* Last Active */}
                    <td className="py-4 px-4 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(c.lastActive)}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        c.rewardsWon > 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {c.rewardsWon > 0 ? 'Winner' : 'No Win'}
                      </span>
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