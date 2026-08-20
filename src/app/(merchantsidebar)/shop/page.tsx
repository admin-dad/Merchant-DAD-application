'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart,
  Search,
  Loader2,
  AlertCircle,
  Package,
  Trash2,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Wallet,
  Coins,
  FileText,
  Download,
  XCircle,
  ChevronDown,
  Filter,
  Tag,
  BadgePercent,
} from 'lucide-react'
import jsPDF from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantData { id: string }
interface Product {
  id: string
  name: string
  description: string | null
  price: number | string // Storing points internally
  image_url: string | null
  stock: number
  category: string | null
  sub_category?: string | null
}

interface CartItem extends Product { quantity: number }

interface OrderItem {
  name: string
  price: number | string
  quantity: number
}
interface Order {
  id: string
  total_amount: number | string
  points_used: number | string
  status: string
  created_at: string
  shipping_address?: string
  coupon_code?: string | null
  discount_amount?: number | string | null
  order_items: OrderItem[]
}

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_points: number
  max_redemptions: number | null
  redemption_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

export default function MerchantShopPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [wallet, setWallet] = useState({ points: 0, cash: 0 })
  
  // Database Categories
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterSubCategory, setFilterSubCategory] = useState('All')
  const [sortOrder, setSortOrder] = useState('newest')
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

  // Coupon State
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  })
  const [placingOrder, setPlacingOrder] = useState(false)

  // ── Fetch Data & Merchant ────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: merchData } = await supabase.from('merchants').select('id').eq('user_id', user.id).single()
      if (!merchData) { setLoading(false); return }
      setMerchant(merchData)

      // Load cart specific to this merchant from localStorage
      const savedCart = localStorage.getItem(`rakvih_cart_${merchData.id}`)
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart))
        } catch (e) {
          console.error('Failed to parse cart from local storage', e)
        }
      }
      setCartLoaded(true)

      const [prodRes, txRes, ordRes, catRes, subCatRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('merchant_transactions').select('wallet_type, transaction_type, amount').eq('merchant_id', merchData.id),
        supabase.from('orders').select('*, order_items(*)').eq('merchant_id', merchData.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('subcategories').select('id, category_id, name').eq('is_active', true).order('sort_order', { ascending: true })
      ])

      if (prodRes.data) setProducts(prodRes.data as Product[])
      if (ordRes.data) setOrders(ordRes.data as Order[])
      if (catRes.data) setCategories(catRes.data)
      if (subCatRes.data) setSubcategories(subCatRes.data)

      if (txRes.data) {
        let pts = 0, cash = 0
        txRes.data.forEach(tx => {
          if (tx.wallet_type === 'points') pts += tx.transaction_type === 'credit' ? tx.amount : -tx.amount
          else cash += tx.transaction_type === 'credit' ? tx.amount : -tx.amount
        })
        setWallet({ points: pts, cash })
      }

      setLoading(false)
    }
    fetchAll()
  }, [router, supabase])

  // ── Persist Cart in LocalStorage (Per Merchant) ───────────────────────
  useEffect(() => {
    if (merchant && cartLoaded) {
      localStorage.setItem(`rakvih_cart_${merchant.id}`, JSON.stringify(cart))
    }
  }, [cart, merchant, cartLoaded])

  // ── Reset Subcategory when Category changes ──────────────────────────
  useEffect(() => {
    setFilterSubCategory('All')
  }, [filterCategory])

  // ── Dynamic Subcategories based on selected Category ─────────────────
  const availableSubcats = useMemo(() => {
    if (filterCategory === 'All') return subcategories
    const selectedCat = categories.find(c => c.name === filterCategory)
    if (!selectedCat) return []
    return subcategories.filter(sc => sc.category_id === selectedCat.id)
  }, [filterCategory, categories, subcategories])

  // ── Cart Logic ───────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty > item.stock ? item.stock : newQty }
      }
      return item
    }))
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id))

  const cartTotalPoints = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)

  // ── Coupon Logic ────────────────────────────────────────────────────
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0
    let discount = 0
    if (appliedCoupon.discount_type === 'percentage') {
      discount = Math.round((cartTotalPoints * Number(appliedCoupon.discount_value)) / 100)
    } else {
      discount = Number(appliedCoupon.discount_value)
    }
    // Never let discount exceed the cart total
    return Math.min(discount, cartTotalPoints)
  }, [appliedCoupon, cartTotalPoints])

  const finalTotalPoints = Math.max(0, cartTotalPoints - discountAmount)

  // If cart contents change such that the applied coupon's minimum no longer holds, drop it
  useEffect(() => {
    if (appliedCoupon && cartTotalPoints < appliedCoupon.min_order_points) {
      setAppliedCoupon(null)
      setCouponError(`Coupon requires a minimum of ${appliedCoupon.min_order_points} Pts`)
    }
  }, [cartTotalPoints, appliedCoupon])

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponError('')
    setCouponLoading(true)

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', code)
        .single()

      if (error || !data) {
        setCouponError('Invalid coupon code.')
        setAppliedCoupon(null)
        return
      }

      const coupon = data as Coupon
      const now = new Date()

      if (!coupon.is_active) {
        setCouponError('This coupon is no longer active.')
        setAppliedCoupon(null)
        return
      }
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        setCouponError('This coupon is not yet valid.')
        setAppliedCoupon(null)
        return
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        setCouponError('This coupon has expired.')
        setAppliedCoupon(null)
        return
      }
      if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) {
        setCouponError('This coupon has reached its redemption limit.')
        setAppliedCoupon(null)
        return
      }
      if (cartTotalPoints < coupon.min_order_points) {
        setCouponError(`Minimum order of ${coupon.min_order_points} Pts required for this coupon.`)
        setAppliedCoupon(null)
        return
      }

      setAppliedCoupon(coupon)
      setCouponError('')
    } catch (err) {
      console.error(err)
      setCouponError('Could not validate coupon. Please try again.')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }
  
  // ── Checkout Logic (Points-Only & Schema-Correct) ─────────────────────
  const handleCheckout = async () => {
    if (!merchant || cart.length === 0) return
    
    if (!addressForm.fullName || !addressForm.phone || !addressForm.street || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      alert("Please fill in all shipping address fields.")
      return
    }

    if (wallet.points < finalTotalPoints) {
      alert("You do not have enough points to complete this redemption.")
      return
    }

    setPlacingOrder(true)

    const formattedAddress = `${addressForm.fullName}, Phone: ${addressForm.phone}, ${addressForm.street}, ${addressForm.city}, ${addressForm.state} - ${addressForm.pincode}`

    try {
      // 1. Create Order (Only sending existing schema columns to prevent 403 errors)
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([
        {
          merchant_id: merchant.id,
          total_amount: finalTotalPoints,
          points_used: finalTotalPoints,
          status: 'completed',
          shipping_address: formattedAddress,
          coupon_code: appliedCoupon?.code ?? null,
          discount_amount: discountAmount
        }
      ]).select().single()

      if (orderError) throw orderError

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity
      }))
      await supabase.from('order_items').insert(orderItems)

      // 3. Deduct Points Transaction
      await supabase.from('merchant_transactions').insert([{
        merchant_id: merchant.id,
        wallet_type: 'points',
        transaction_type: 'debit',
        amount: finalTotalPoints,
        description: `Rewards Redemption Order #${orderData.id.substring(0, 8)}${appliedCoupon ? ` (Coupon: ${appliedCoupon.code})` : ''}`
      }])

      // 4. Bump coupon redemption count, if one was used
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ redemption_count: appliedCoupon.redemption_count + 1 })
          .eq('id', appliedCoupon.id)
      }

      // 5. Update UI State & Clear Cart Storage
      setWallet(prev => ({ ...prev, points: prev.points - finalTotalPoints }))
      
      setOrders(prev => [{ ...orderData, order_items: orderItems, shipping_address: formattedAddress }, ...prev])
      setCart([])
      localStorage.removeItem(`rakvih_cart_${merchant.id}`)
      
      setAddressForm({ fullName: '', phone: '', street: '', city: '', state: '', pincode: '' })
      removeCoupon()
      setIsCheckoutOpen(false)
      setActiveTab('orders')
      
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Checkout failed. Please try again.')
    } finally {
      setPlacingOrder(false)
    }
  }

  // ── Cancel Order & Refund Points ─────────────────────────────────────
  const handleCancelOrder = async (order: Order) => {
    if (!merchant) return
    if (!confirm('Cancel this order? Your reward points will be refunded.')) return

    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
      
      if (Number(order.points_used) > 0) {
        await supabase.from('merchant_transactions').insert([{
          merchant_id: merchant.id, 
          wallet_type: 'points', 
          transaction_type: 'credit', 
          amount: Number(order.points_used), 
          description: `Refund for Order #${order.id.substring(0,8)}`
        }])
      }
      
      setWallet(prev => ({ ...prev, points: prev.points + Number(order.points_used) }))
      alert('Order cancelled and points refunded!')
    }
  }

  // ── Download Invoice ─────────────────────────────────────────────────
  const downloadInvoice = (order: Order) => {
    const pdf = new jsPDF()
    pdf.setFontSize(20)
    pdf.text('DAD Solutions - Rewards Invoice', 14, 20)
    pdf.setFontSize(10)
    pdf.setTextColor(100)
    pdf.text(`Order ID: ${order.id}`, 14, 30)
    pdf.text(`Date: ${new Date(order.created_at).toLocaleString('en-IN')}`, 14, 35)
    pdf.text(`Status: ${order.status.toUpperCase()}`, 14, 40)
    
    if (order.shipping_address) {
      pdf.text(`Shipping Address: ${order.shipping_address}`, 14, 45)
    }
    
    pdf.setDrawColor(200)
    pdf.line(14, 52, 196, 52)
    
    pdf.setTextColor(0)
    pdf.setFontSize(12)
    pdf.text('Redeemed Items:', 14, 60)
    
    let y = 68
    pdf.setFontSize(10)
    order.order_items.forEach(item => {
      pdf.text(`${item.name} (x${item.quantity})`, 14, y)
      pdf.text(`${Number(item.price) * item.quantity} Pts`, 150, y)
      y += 7
    })
    
    y += 10
    pdf.setDrawColor(200)
    pdf.line(14, y, 196, y)
    y += 7

    const discount = Number(order.discount_amount) || 0
    if (discount > 0) {
      pdf.setFontSize(10)
      pdf.setTextColor(100)
      pdf.text(`Coupon Applied: ${order.coupon_code ?? ''}`, 14, y)
      pdf.text(`- ${discount} Pts`, 150, y)
      y += 7
      pdf.setTextColor(0)
    }
    
    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    pdf.text(`Total Points Spent: ${Number(order.total_amount)} Pts`, 14, y)
    
    pdf.save(`Invoice_${order.id.substring(0,8)}.pdf`)
  }

  // ── Apply Search, Filters, and Sorting ───────────────────────────────
  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory
      const matchesSubCategory = filterSubCategory === 'All' || p.sub_category === filterSubCategory
      
      return matchesSearch && matchesCategory && matchesSubCategory
    })

    result.sort((a, b) => {
      if (sortOrder === 'points_asc') return Number(a.price) - Number(b.price)
      if (sortOrder === 'points_desc') return Number(b.price) - Number(a.price)
      return 0 
    })

    return result
  }, [products, searchQuery, filterCategory, filterSubCategory, sortOrder])

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin text-[#1857D6]" /></div>

  return (
 <div className="min-h-full w-full bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>   {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <ShoppingCart size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rewards Store</h1>
              <p className="mt-1 text-sm text-slate-500">Redeem catalog products using your earned reward points.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 xl:justify-end">
            {/* Wallet Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                <Coins size={16} className="text-[#1857D6]" />
                <span className="text-sm font-bold text-slate-900">{wallet.points} Pts</span>
              </div>
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>

            {/* Top Navigation Options */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('shop')} 
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'shop' ? 'bg-[#1857D6]/10 border-[#1857D6]/20 text-[#1857D6]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Package size={16} /> <span className="hidden sm:block">Catalog</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('cart')} 
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'cart' ? 'bg-[#1857D6]/10 border-[#1857D6]/20 text-[#1857D6]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <ShoppingCart size={16} /> <span className="hidden sm:block">Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {cart.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'orders' ? 'bg-[#1857D6]/10 border-[#1857D6]/20 text-[#1857D6]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <FileText size={16} /> <span className="hidden sm:block">Orders</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── SHOP TAB ── */}
        {activeTab === 'shop' && (
          <motion.div key="shop-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            
            {/* Filters Bar */}
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10" 
                />
              </div>

              {/* Advanced Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden items-center gap-1.5 text-sm font-medium text-slate-500 xl:flex">
                  <Filter size={16} />
                  Filters:
                </div>
                
                {/* Category Filter */}
                <div className="relative min-w-[140px]">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Sub-Category Filter */}
                <div className="relative min-w-[150px]">
                  <select
                    value={filterSubCategory}
                    onChange={(e) => setFilterSubCategory(e.target.value)}
                    disabled={availableSubcats.length === 0}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="All">All Sub-Categories</option>
                    {availableSubcats.map(sub => (
                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Filter */}
                <div className="relative min-w-[150px]">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  >
                    <option value="newest">Newest First</option>
                    <option value="points_asc">Points: Low to High</option>
                    <option value="points_desc">Points: High to Low</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {processedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 text-center shadow-sm">
                <Package size={40} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {processedProducts.map(p => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="group flex flex-col rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
                    
                    {/* Clickable Area for Detail Navigation */}
                    <div 
                      className="cursor-pointer flex-1 flex flex-col z-0"
                      onClick={() => router.push(`/shop/${p.id}`)}
                    >
                      <div className="h-32 w-full rounded-xl bg-slate-100 overflow-hidden mb-3 flex items-center justify-center relative">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <Package size={32} className="text-slate-300 transition-transform duration-300 group-hover:scale-110" />
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 truncate transition-colors group-hover:text-[#1857D6]">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex-1 line-clamp-2">{p.description}</p>
                    </div>

                    {/* Quick Add Area */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 relative z-10">
                      <span className="text-sm font-bold text-[#1857D6] bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Coins size={12} /> {Number(p.price)} Pts
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation() 
                          addToCart(p)
                        }} 
                        disabled={p.stock === 0} 
                        className="flex items-center gap-1 rounded-lg bg-[#1857D6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0B2E7A] disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CART TAB ── */}
        {activeTab === 'cart' && (
          <motion.div key="cart-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Your Cart</h2>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-800">Your cart is empty</p>
                  <button onClick={() => setActiveTab('shop')} className="mt-4 text-[#1857D6] font-semibold text-sm hover:underline cursor-pointer">Continue Shopping</button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100">
                        <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <Package size={20} className="text-slate-300 m-auto mt-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          <p className="text-xs text-slate-500">{Number(item.price)} Pts x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"><Minus size={12} /></button>
                          <span className="text-sm font-medium w-6 text-center text-slate-900">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1 cursor-pointer"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Input */}
                  <div className="mb-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                    <label className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                      <Tag size={13} /> Have a coupon?
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <BadgePercent size={16} className="text-emerald-600" />
                          <div>
                            <p className="text-sm font-bold text-emerald-700">{appliedCoupon.code}</p>
                            <p className="text-xs text-emerald-600">
                              {appliedCoupon.discount_type === 'percentage'
                                ? `${appliedCoupon.discount_value}% off`
                                : `${appliedCoupon.discount_value} Pts off`}
                            </p>
                          </div>
                        </div>
                        <button onClick={removeCoupon} className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value); setCouponError('') }}
                          onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon() }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 uppercase focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle size={12} /> {couponError}
                      </p>
                    )}
                  </div>
                  
                  <div className="border-t border-slate-100 pt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Subtotal</span>
                      <span className="text-sm font-semibold text-slate-700">{cartTotalPoints} Pts</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-600">Coupon Discount ({appliedCoupon?.code})</span>
                        <span className="text-sm font-semibold text-emerald-600">- {discountAmount} Pts</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-semibold text-slate-500">Total Points Required</span>
                      <span className="text-xl font-bold text-[#1857D6]">{finalTotalPoints} Pts</span>
                    </div>
                  </div>

                  <button onClick={() => setIsCheckoutOpen(true)} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:translate-y-[-1px] hover:shadow-lg cursor-pointer transition-all">
                    Proceed to Redemption Checkout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <motion.div key="orders-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Orders History</h2>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-800">No orders yet</p>
                  <button onClick={() => setActiveTab('shop')} className="mt-4 text-[#1857D6] font-semibold text-sm hover:underline cursor-pointer">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => (
                    <div key={o.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-mono text-slate-500">Order #{o.id.substring(0, 8)}</p>
                        <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{o.status}</span>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {o.order_items.map((item, i) => (
                          <p key={i} className="text-sm font-medium text-slate-700">{item.name} <span className="text-slate-500 font-normal">(x{item.quantity})</span></p>
                        ))}
                      </div>
                      {o.shipping_address && (
                        <p className="text-xs text-slate-500 mb-3"><strong>Shipping To:</strong> {o.shipping_address}</p>
                      )}
                      {o.coupon_code && Number(o.discount_amount) > 0 && (
                        <p className="text-xs text-emerald-600 mb-3 flex items-center gap-1">
                          <Tag size={12} /> Coupon <strong>{o.coupon_code}</strong> applied &minus; {Number(o.discount_amount)} Pts saved
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 pt-4 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Points Spent: <span className="font-bold text-[#1857D6] text-base">{Number(o.total_amount)} Pts</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => downloadInvoice(o)} className="flex flex-1 justify-center items-center gap-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                            <Download size={14} /> Invoice
                          </button>
                          {o.status === 'completed' && (
                            <button onClick={() => handleCancelOrder(o)} className="flex flex-1 justify-center items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                              <XCircle size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHECKOUT MODAL ── */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"><X size={20} /></button>
              
              <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <h2 className="text-2xl font-semibold text-slate-900 mb-6">Secure Redemption Checkout</h2>
                
                <div className="space-y-4">
                  {/* Structured Professional Address Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={addressForm.fullName} 
                        onChange={(e) => setAddressForm({...addressForm, fullName: e.target.value})} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 9876543210"
                        value={addressForm.phone} 
                        onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Street Address / Door No</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Flat 4B, Green Valley Apartments, Main Road"
                      value={addressForm.street} 
                      onChange={(e) => setAddressForm({...addressForm, street: e.target.value})} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">City</label>
                      <input 
                        type="text" 
                        placeholder="City"
                        value={addressForm.city} 
                        onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6]" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">State</label>
                      <input 
                        type="text" 
                        placeholder="State"
                        value={addressForm.state} 
                        onChange={(e) => setAddressForm({...addressForm, state: e.target.value})} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6]" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Pincode</label>
                      <input 
                        type="text" 
                        placeholder="Pincode"
                        value={addressForm.pincode} 
                        onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})} 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-[#1857D6]" 
                      />
                    </div>
                  </div>

                  {/* Coupon Input (also editable from checkout) */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                      <Tag size={13} /> Coupon
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                        <span className="text-sm font-bold text-emerald-700">{appliedCoupon.code} applied</span>
                        <button onClick={removeCoupon} className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value); setCouponError('') }}
                          onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon() }}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-2 text-xs text-rose-600">{couponError}</p>}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">Cart Subtotal</span>
                      <span className="font-bold text-slate-900">{cartTotalPoints} Pts</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-600 font-medium">Discount ({appliedCoupon?.code})</span>
                        <span className="font-bold text-emerald-600">- {discountAmount} Pts</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="text-slate-600 font-medium">Total Due</span>
                      <span className="font-bold text-[#1857D6]">{finalTotalPoints} Pts</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">Your Balance</span>
                      <span className="font-bold text-slate-900">{wallet.points} Pts</span>
                    </div>
                  </div>

                  {wallet.points < finalTotalPoints && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                      ⚠️ You do not have enough points to complete this order.
                    </div>
                  )}

                  <button 
                    onClick={handleCheckout} 
                    disabled={placingOrder || wallet.points < finalTotalPoints} 
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer transition-all mt-4"
                  >
                    {placingOrder ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Complete Redemption
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}