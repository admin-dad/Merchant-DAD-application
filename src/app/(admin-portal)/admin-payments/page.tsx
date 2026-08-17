'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2 as BuildingIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  Clock as ClockIcon,
  DollarSign as DollarIcon,
  ShieldAlert as ShieldAlertIcon,
} from 'lucide-react'

interface MerchantRecord {
  id: string
  business_name: string | null
  billing_rate: number | null
  created_at: string
}

interface PaymentRecord {
  id: string
  merchant_id: string | null
  amount: number
  status: string
  created_at: string
}

interface QRScanRecord {
  id: string
  merchant_id: string | null
  is_paid: boolean | null
  payment_status: string | null
}

interface MerchantAggregatedData {
  id: string
  businessName: string
  billingRate: number
  totalPaidAmount: number
  paymentCount: number
  totalScansCount: number
  paidScansCount: number
  unpaidScansCount: number
  outstandingAmount: number
}

export default function AdminPaymentsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [merchants, setMerchants] = useState<MerchantRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [scans, setScans] = useState<QRScanRecord[]>([])

  const [searchTerm, setSearchTerm] = useState<string>('')

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch admin payment data')
      }

      setMerchants(data.merchants || [])
      setPayments(data.payments || [])
      setScans(data.scans || [])
    } catch (err: unknown) {
      console.error('Admin Payments Fetch Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  // Aggregate stats per merchant
  const aggregatedMerchants: MerchantAggregatedData[] = useMemo(() => {
    return merchants.map((merchant) => {
      const merchantPayments = payments.filter(
        (p) =>
          p.merchant_id === merchant.id &&
          (p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'approved')
      )
      const totalPaidAmount = merchantPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const paymentCount = merchantPayments.length

      const merchantScans = scans.filter((s) => s.merchant_id === merchant.id)
      const totalScansCount = merchantScans.length
      const paidScansCount = merchantScans.filter(
        (s) => s.is_paid === true || s.payment_status === 'paid'
      ).length
      const unpaidScansCount = totalScansCount - paidScansCount

      const rate = merchant.billing_rate && merchant.billing_rate > 0 ? merchant.billing_rate : 4.0
      const outstandingAmount = unpaidScansCount * rate

      return {
        id: merchant.id,
        businessName: merchant.business_name || 'Unnamed Merchant',
        billingRate: rate,
        totalPaidAmount,
        paymentCount,
        totalScansCount,
        paidScansCount,
        unpaidScansCount,
        outstandingAmount,
      }
    })
  }, [merchants, payments, scans])

  const filteredMerchants = useMemo(() => {
    return aggregatedMerchants.filter((m) =>
      m.businessName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [aggregatedMerchants, searchTerm])

  const totalSystemRevenue = aggregatedMerchants.reduce((sum, m) => sum + m.totalPaidAmount, 0)
  const totalSystemOutstanding = aggregatedMerchants.reduce((sum, m) => sum + m.outstandingAmount, 0)
  const totalSystemPaymentsCount = aggregatedMerchants.reduce((sum, m) => sum + m.paymentCount, 0)

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-blue-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <BuildingIcon size={30} />
            </div>
            <div>
              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1857D6] mb-1">
                Admin Portal
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Payments Management
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Track merchant payment history, total paid revenue, and outstanding scan balances.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon size={16} className={loading ? 'animate-spin text-[#1857D6]' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
          <AlertIcon size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Collected Revenue
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">
            ₹{totalSystemRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{totalSystemPaymentsCount} successful transactions</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Outstanding Balance
            </span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <ClockIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">
            ₹{totalSystemOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Pending from all merchants</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active Merchants
            </span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#1857D6]">
              <BuildingIcon size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{merchants.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Registered businesses</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1857D6] focus:outline-none"
          />
        </div>
      </div>

      {/* Merchants Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderIcon size={32} className="animate-spin text-[#1857D6]" />
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-sm">
              <BuildingIcon size={32} />
            </div>
            <p className="text-base font-semibold text-slate-800">No merchants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Business Name</th>
                  <th className="py-4 px-6 text-center">Payments Made</th>
                  <th className="py-4 px-6">Total Paid Amount</th>
                  <th className="py-4 px-6">Scans Breakdown</th>
                  <th className="py-4 px-6">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 text-sm">{merchant.businessName}</p>
                      <span className="text-[11px] font-mono text-slate-400">ID: {merchant.id.slice(0, 8)}...</span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1857D6]">
                        {merchant.paymentCount} payments
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-extrabold text-emerald-600 text-sm">
                        ₹{merchant.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-800">
                          {merchant.totalScansCount} Total Scans
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-600 font-medium">
                            {merchant.paidScansCount} Paid
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-600 font-medium">
                            {merchant.unpaidScansCount} Unpaid
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`font-extrabold text-sm ${
                          merchant.outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        ₹{merchant.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}