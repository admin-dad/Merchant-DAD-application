'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Receipt,
  Search,
  Loader2,
  AlertCircle,
  IndianRupee,
  TrendingUp,
  Download,
  Wallet,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant {
  id: string
  business_name: string
  category: string
  billing_rate: number
}

interface MerchantBilling extends Merchant {
  totalScans: number
  totalBilled: number
  totalPaid: number
  outstanding: number
}

export default function AdminBillingPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingData, setBillingData] = useState<MerchantBilling[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch Billing Data ───────────────────────────────────────────────
  useEffect(() => {
    const fetchBilling = async () => {
      setLoading(true)
      
      try {
        const [merchantsRes, paymentsRes, scansRes] = await Promise.all([
          supabase.from('merchants').select('id, business_name, category, billing_rate'),
          supabase.from('merchant_payments').select('merchant_id, amount, status'),
          supabase.from('qr_scans').select('merchant_id')
        ])

        if (merchantsRes.error || paymentsRes.error || scansRes.error) {
          throw new Error('Failed to load billing data.')
        }

        const merchants = merchantsRes.data as Merchant[]
        const payments = paymentsRes.data || []
        const scans = scansRes.data || []

        // Calculate Billing per Merchant
        const billingMap: Record<string, MerchantBilling> = {}
        
        merchants.forEach(m => {
          billingMap[m.id] = {
            ...m,
            totalScans: 0,
            totalBilled: 0,
            totalPaid: 0,
            outstanding: 0
          }
        })

        // Count scans per merchant
        scans.forEach(scan => {
          if (billingMap[scan.merchant_id]) {
            billingMap[scan.merchant_id].totalScans++
          }
        })

        // Calculate approved payments per merchant
        payments.forEach(p => {
          if (billingMap[p.merchant_id] && p.status === 'approved') {
            billingMap[p.merchant_id].totalPaid += p.amount
          }
        })

        // Finalize calculations
        const billArray = Object.values(billingMap).map(b => {
          const rate = b.billing_rate || 1
          b.totalBilled = b.totalScans * rate
          b.outstanding = Math.max(0, b.totalBilled - b.totalPaid)
          return b
        })

        setBillingData(billArray)

      } catch (err: any) {
        setError(err.message || 'Failed to load billing data.')
      } finally {
        setLoading(false)
      }
    }

    fetchBilling()
  }, [supabase])

  // ── Export to CSV ────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Business Name', 'Category', 'Rate (₹)', 'Total Scans', 'Total Billed (₹)', 'Total Paid (₹)', 'Outstanding (₹)']
    const rows = filteredBillings.map(m => [
      m.business_name,
      m.category,
      m.billing_rate || 1,
      m.totalScans,
      m.totalBilled.toFixed(2),
      m.totalPaid.toFixed(2),
      m.outstanding.toFixed(2)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Merchant_Billing_Ledger.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredBillings = billingData.filter(m => 
    m.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPlatformOutstanding = billingData.reduce((sum, m) => sum + m.outstanding, 0)
  const totalPlatformRevenue = billingData.reduce((sum, m) => sum + m.totalPaid, 0)
  const totalPlatformScans = billingData.reduce((sum, m) => sum + m.totalScans, 0)

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
              <Receipt size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Billing Ledger
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Master financial overview of all merchant accounts.
              </p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Collected</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><IndianRupee size={16} className="text-[#3E7A1C]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{totalPlatformRevenue.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Lifetime revenue from merchants</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding Balance</span>
            <div className="p-2 bg-rose-50 rounded-lg"><Wallet size={16} className="text-rose-500" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{totalPlatformOutstanding.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Total uncollected bills</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Platform Scans</span>
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalPlatformScans.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Billable customer engagements</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
      </div>

      {/* Master Billing Ledger Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Receipt size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">All Merchant Accounts</h2>
            <p className="text-xs text-slate-500">Showing {filteredBillings.length} merchants.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Merchant / Category</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Rate</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Scans</th>
                <th className="py-3 px-4 font-medium">Total Billed</th>
                <th className="py-3 px-4 font-medium">Total Paid</th>
                <th className="py-3 px-4 font-medium text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filteredBillings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No merchants found.
                  </td>
                </tr>
              ) : (
                filteredBillings.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-900">{m.business_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.category}</p>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell text-slate-600">₹{m.billing_rate || 1}</td>
                    <td className="py-4 px-4 hidden sm:table-cell text-slate-600 flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-slate-400" />
                      {m.totalScans}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">₹{m.totalBilled.toFixed(2)}</td>
                    <td className="py-4 px-4 text-emerald-600 font-medium">₹{m.totalPaid.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-bold ${m.outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        ₹{m.outstanding.toFixed(2)}
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