'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  ShoppingCart,
  Minus,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Coins
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
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

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const { id } = use(params)

  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [added, setAdded] = useState(false)

  // ── Fetch Product Details ────────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Product not found or has been removed.')
      } else {
        setProduct(data as Product)
      }
      setLoading(false)
    }

    fetchProduct()
  }, [id, supabase])

  // ── Quantity Handlers ────────────────────────────────────────────────
  const increaseQty = () => {
    if (product && quantity < product.stock) {
      setQuantity(prev => prev + 1)
    }
  }

  const decreaseQty = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1)
    }
  }

  // ── Add to Cart Logic ────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!product) return
    setAddingToCart(true)

    setTimeout(() => {
      const existingCart = JSON.parse(localStorage.getItem('rakvih_cart') || '[]')
      const existingItemIndex = existingCart.findIndex((item: any) => item.id === product.id)
      
      if (existingItemIndex >= 0) {
        existingCart[existingItemIndex].quantity += quantity
      } else {
        existingCart.push({ ...product, quantity })
      }
      
      localStorage.setItem('rakvih_cart', JSON.stringify(existingCart))

      setAddingToCart(false)
      setAdded(true)
      
      setTimeout(() => setAdded(false), 2000)
    }, 600)
  }

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error / Not Found State ─────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Oops! Something went wrong</h2>
        <p className="mt-2 text-slate-500">{error}</p>
        <button 
          onClick={() => router.back()} 
          className="mt-8 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 cursor-pointer"
        >
          Go Back to Store
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Back Navigation */}
      <button 
        onClick={() => router.back()} 
        className="group mb-8 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#1857D6] cursor-pointer"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm transition-all group-hover:border-[#1857D6]/30 group-hover:bg-[#1857D6]/5">
          <ArrowLeft size={16} />
        </div>
        Back to Store
      </button>

      {/* Main Product Layout */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-10 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-2"
      >
        {/* Left Column: Image Area */}
        <div className="flex flex-col gap-4">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-6">
            {product.image_url ? (
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                src={product.image_url} 
                alt={product.name} 
                className="h-full w-full object-contain"
              />
            ) : (
              <Package size={80} className="text-slate-300" />
            )}
            
            {/* Stock Badge on Image */}
            {product.stock <= 0 && (
              <div className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Details */}
        <div className="flex flex-col justify-center">
          
          {/* Breadcrumbs / Categories */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {product.category && (
              <span className="rounded-md bg-[#1857D6]/10 px-2.5 py-1 text-[#1857D6]">
                {product.category}
              </span>
            )}
            {product.sub_category && (
              <>
                <span className="text-slate-300">•</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">
                  {product.sub_category}
                </span>
              </>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {product.name}
          </h1>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="text-2xl font-bold text-[#1857D6] bg-blue-50 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
              <Coins size={20} />
              {Number(product.price)} Pts
            </span>
          </div>

          <hr className="my-8 border-slate-100" />

          {/* Description */}
          <div className="mb-8 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Product Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {product.description || 'No description provided for this product.'}
            </p>
          </div>

          {/* Action Area (Quantity & Button) */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Quantity</span>
              <span className={`text-xs font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {product.stock > 0 ? `${product.stock} units available` : 'Currently unavailable'}
              </span>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Quantity Selector */}
              <div className="flex h-14 items-center justify-between rounded-xl border border-slate-200 bg-white px-2 shadow-sm sm:w-40">
                <button 
                  onClick={decreaseQty}
                  disabled={quantity <= 1 || product.stock <= 0}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                >
                  <Minus size={18} />
                </button>
                <span className="w-10 text-center font-bold text-slate-900">
                  {quantity}
                </span>
                <button 
                  onClick={increaseQty}
                  disabled={quantity >= product.stock || product.stock <= 0}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || addingToCart || added}
                className={`relative flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-8 text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
                  added 
                    ? 'bg-emerald-500 shadow-emerald-500/25' 
                    : 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] shadow-blue-500/25 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none'
                }`}
              >
                {addingToCart ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : added ? (
                  <>
                    <CheckCircle2 size={20} />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1857D6]">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Secure <br/>Redemption</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Truck size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Fast <br/>Processing</p>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  )
}