'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart,
  Search,
  Loader2,
  AlertCircle,
  Filter,
  Eye,
  X,
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  Coins,
  ChevronDown,
  Store,
  Calendar,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Merchant { id: string; business_name: string }
interface OrderItem { product_id?: string; name: string; price: number | string; quantity: number }

interface Order {
  id: string
  merchant_id: string
  total_amount: number | string
  points_used: number | string
  status: string
  shipping_address: string | null
  created_at: string
  order_items: OrderItem[]
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_OPTIONS = ['pending', 'completed', 'dispatched', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({})
  const [allProducts, setAllProducts] = useState<{ id: string; name: string }[]>([])
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [merchantFilter, setMerchantFilter] = useState('All')
  const [productFilter, setProductFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')
  
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // ── Fetch Orders, Merchants & Products ───────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        const [ordRes, merchRes, prodRes] = await Promise.all([
          supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
          supabase.from('merchants').select('id, business_name').order('business_name', { ascending: true }),
          supabase.from('products').select('id, name').order('name', { ascending: true })
        ])

        if (ordRes.error) throw ordRes.error

        setOrders(ordRes.data as Order[])

        const merchData = merchRes.data as Merchant[]
        setMerchants(merchData || [])
        
        const map: Record<string, string> = {}
        merchData.forEach(m => map[m.id] = m.business_name)
        setMerchantMap(map)

        if (prodRes.data) setAllProducts(prodRes.data)

      } catch (err: any) {
        setError(err.message || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // ── Handle Status Update ─────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : prev)
      }
    } else {
      alert('Failed to update order status.')
    }
    
    setUpdatingId(null)
  }

  // ── Advanced Filter Logic ────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const merchantName = merchantMap[o.merchant_id]?.toLowerCase() || ''
      const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) || merchantName.includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'All' || o.status === statusFilter
      const matchesMerchant = merchantFilter === 'All' || o.merchant_id === merchantFilter
      
      // Product Filter Logic
      const matchesProduct = productFilter === 'All' || o.order_items.some(item => 
        item.name.toLowerCase().includes(productFilter.toLowerCase()) || item.product_id === productFilter
      )

      // Date Filter Logic
      let matchesDate = true
      if (dateFilter !== 'All') {
        const orderDate = new Date(o.created_at).getTime()
        const now = new Date().getTime()
        const diffDays = (now - orderDate) / (1000 * 3600 * 24)

        if (dateFilter === 'today') matchesDate = diffDays <= 1
        if (dateFilter === '7days') matchesDate = diffDays <= 7
        if (dateFilter === '30days') matchesDate = diffDays <= 30
      }

      return matchesSearch && matchesStatus && matchesMerchant && matchesProduct && matchesDate
    })
  }, [orders, searchQuery, statusFilter, merchantFilter, productFilter, dateFilter, merchantMap])

  // ── Stats Calculations ───────────────────────────────────────────────
  const totalPointsRedeemed = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length

  const formatDate = (isoDate: string) => new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

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
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
            <ShoppingCart size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Orders Management</h1>
            <p className="mt-1 text-sm text-slate-500">Track and manage reward store redemptions and order statuses.</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Orders</span>
            <div className="p-2 bg-blue-50 rounded-xl"><ShoppingCart size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{orders.length}</h3>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Points Redeemed</span>
            <div className="p-2 bg-blue-50 rounded-xl"><Coins size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-[#1857D6]">{totalPointsRedeemed.toLocaleString()} Pts</h3>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending / Completed</span>
            <div className="p-2 bg-amber-50 rounded-xl"><Clock size={16} className="text-amber-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{pendingCount} <span className="text-lg text-slate-400 font-normal">/ {completedCount}</span></h3>
        </div>
      </div>

      {/* Search & Multi-Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm xl:flex-row xl:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders by ID or Merchant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 hidden 2xl:flex">
            <Filter size={16} />
            Filters:
          </div>

          {/* Merchant Filter */}
          <div className="relative min-w-[150px]">
            <Store size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 truncate"
            >
              <option value="All">All Merchants</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.business_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Product Filter */}
          <div className="relative min-w-[150px]">
            <Package size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 truncate"
            >
              <option value="All">All Products</option>
              {allProducts.map(prod => (
                <option key={prod.id} value={prod.name}>{prod.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative min-w-[140px]">
            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="All">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-9 text-xs sm:text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="capitalize">{opt}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Platform Orders</h2>
              <p className="text-xs text-slate-500">Showing {filteredOrders.length} of {orders.length} orders.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Order ID</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs hidden md:table-cell">Merchant</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Total Points</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs hidden sm:table-cell">Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <Package size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-900">No orders found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-700">#{o.id.substring(0, 8)}</td>
                    <td className="py-4 px-4 hidden md:table-cell font-semibold text-slate-900">{merchantMap[o.merchant_id] || 'Unknown Merchant'}</td>
                    <td className="py-4 px-4 font-bold text-[#1857D6]">
                      <span className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full text-xs">
                        <Coins size={12} />
                        {Number(o.total_amount)} Pts
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-xs hidden sm:table-cell">{formatDate(o.created_at)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[o.status] || statusStyles.pending}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => { setSelectedOrder(o); setIsModalOpen(true) }}
                        className="flex items-center gap-1 rounded-lg bg-[#1857D6]/10 text-[#1857D6] hover:bg-[#1857D6]/20 border border-[#1857D6]/20 px-3 py-1.5 text-xs font-semibold cursor-pointer ml-auto transition-colors shadow-sm"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* View Order Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedOrder && (
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
                    <Package size={13} />
                    Order Details
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Order #{selectedOrder.id.substring(0, 8)}</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Placed by <strong className="text-slate-800">{merchantMap[selectedOrder.merchant_id] || 'Unknown'}</strong> on {formatDate(selectedOrder.created_at)}</p>
                </div>

                {/* Items List */}
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Redeemed Items</h4>
                  <div className="space-y-2.5">
                    {selectedOrder.order_items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-800">{item.name} <span className="text-slate-400 font-normal">(x{item.quantity})</span></span>
                        <span className="font-bold text-[#1857D6]">{Number(item.price) * item.quantity} Pts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6 p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 text-sm shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Summary</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Total Points Deducted</span>
                    <span className="font-bold text-slate-900 text-base">{Number(selectedOrder.total_amount)} Pts</span>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shipping_address && (
                  <div className="mb-6 p-4 rounded-2xl border border-slate-200/80 text-sm bg-slate-50/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shipping Address</h4>
                    <p className="text-slate-700">{selectedOrder.shipping_address}</p>
                  </div>
                )}

                {/* Status Update Section */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Update Order Status</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map(status => {
                      const isActive = selectedOrder.status === status
                      let icon = <Clock size={14} />
                      if (status === 'completed') icon = <CheckCircle2 size={14} />
                      if (status === 'dispatched') icon = <Truck size={14} />
                      if (status === 'delivered') icon = <Package size={14} />
                      if (status === 'cancelled') icon = <XCircle size={14} />

                      return (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                          disabled={isActive || updatingId === selectedOrder.id}
                          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold capitalize transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm ${
                            isActive 
                              ? `${statusStyles[status]} border-2 opacity-90` 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {updatingId === selectedOrder.id ? <Loader2 size={14} className="animate-spin" /> : icon}
                          {status}
                        </button>
                      )
                    })}
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