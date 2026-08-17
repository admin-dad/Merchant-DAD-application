'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Percent,
  Wallet,
  FileBarChart2,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store
} from 'lucide-react'

interface VendorProfile {
  id: string
  store_name?: string
  business_name?: string
  status?: string
}

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
  })

  useEffect(() => {
    const fetchVendorData = async () => {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/')
        return
      }

      // Fetch vendor profile linked to user
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!vendorError && vendorData) {
        setVendor(vendorData)

        // Fetch metrics (products count, orders, etc.)
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendorData.id)

        const { count: orderCount } = await supabase
          .from('vendor_orders')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendorData.id)

        setStats({
          totalProducts: productCount || 0,
          totalOrders: orderCount || 0,
          pendingOrders: 2, // Example placeholder or real query
          totalEarnings: 45280, // Example placeholder or aggregated sum
        })
      }

      setLoading(false)
    }

    fetchVendorData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-transparent">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  const storeTitle = vendor?.store_name || vendor?.business_name || 'My Vendor Store'
  const approvalStatus = vendor?.status || 'Active'

  return (
    <div className="mx-auto max-w-7xl space-y-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-[#090D16] p-6 shadow-xl sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/20 to-[#7BC142]/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Store size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {storeTitle}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  approvalStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  Status: {approvalStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Welcome back! Here is your business overview and performance summary.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/vendor/products')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:brightness-115 cursor-pointer"
            >
              <Package size={16} />
              Add New Product
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Listed Products</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-[#4F8CFF]">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.totalProducts}</h3>
            <span className="flex items-center text-xs font-medium text-emerald-400">
              <TrendingUp size={14} className="mr-1" /> Active
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.totalOrders}</h3>
            <span className="text-xs font-medium text-slate-400">All time</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Orders</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.pendingOrders}</h3>
            <span className="text-xs font-medium text-amber-400">Requires fulfillment</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Earnings</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-[#7BC142]">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">₹{stats.totalEarnings.toLocaleString()}</h3>
            <span className="flex items-center text-xs font-medium text-[#7BC142]">
              <ArrowUpRight size={14} className="mr-1" /> Settled
            </span>
          </div>
        </motion.div>

      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Quick Links Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">Vendor Portal Modules</h2>
          <p className="text-xs text-slate-400">Quickly access management tools and configuration sections.</p>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            {[
              { label: 'Product Management', href: '/vendor/products', icon: Package, desc: 'Add, edit and manage listed products.' },
              { label: 'Inventory Stocks', href: '/vendor/inventory', icon: Boxes, desc: 'Monitor stock levels per item.' },
              { label: 'Orders Fulfillment', href: '/vendor/orders', icon: ShoppingCart, desc: 'View and process customer orders.' },
              { label: 'Settlements & Payouts', href: '/vendor/settlements', icon: Wallet, desc: 'Track wallet balance and payouts.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="group flex cursor-pointer items-start gap-3.5 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-blue-500/30 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#4F8CFF] group-hover:scale-105 transition-transform">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#4F8CFF] transition-colors">{item.label}</h3>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Approval & System Status */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Verification & Status</h2>
            <p className="text-xs text-slate-400 mt-1">Your store approval status summary.</p>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 border border-white/5">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-white">Business Profile</p>
                  <p className="text-slate-400">Verified & active on network</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 border border-white/5">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-white">Payout Gateway</p>
                  <p className="text-slate-400">Bank account connected</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/vendor/profile')}
            className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-all cursor-pointer"
          >
            Update Vendor Profile
          </button>
        </div>

      </div>

    </div>
  )
}