// app/vendor/pricing/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  ImageOff,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  X,
  Pencil,
  Boxes,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  vendor_id: string
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

type SortKey = 'price_desc' | 'price_asc' | 'name_asc' | 'newest'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'newest', label: 'Newest First' },
]

export default function PricingPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('price_desc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  // Inline quick-edit (like a spreadsheet cell)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Precise edit modal (price + optional notes-free)
  const [modalTarget, setModalTarget] = useState<Product | null>(null)
  const [modalPrice, setModalPrice] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Load vendor + products ────────────────────────────────────────────
  const loadProducts = useCallback(
    async (vId: string) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vId)
        .order('name', { ascending: true })

      if (!error && data) setProducts(data as Product[])
    },
    [supabase]
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (vendor) {
        setVendorId(vendor.id)
        await loadProducts(vendor.id)
      }
      setLoading(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [supabase, loadProducts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Derived stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (products.length === 0) {
      return { total: 0, avg: 0, highest: 0, lowest: 0 }
    }
    const prices = products.map((p) => p.price)
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
    return {
      total: products.length,
      avg,
      highest: Math.max(...prices),
      lowest: Math.min(...prices),
    }
  }, [products])

  // ── Filter + sort ────────────────────────────────────────────────────
  const visibleProducts = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }

    switch (sortKey) {
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    return list
  }, [products, search, sortKey])

  // ── Inline quick-edit ────────────────────────────────────────────────
  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditingValue(String(product.price))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  const commitEdit = async (product: Product) => {
    const value = Number(editingValue)

    if (editingValue.trim() === '' || isNaN(value) || value < 0) {
      setToast({ type: 'error', text: 'Enter a valid price.' })
      return
    }

    if (value === product.price) {
      cancelEdit()
      return
    }

    setSavingId(product.id)
    const { error } = await supabase.from('products').update({ price: value }).eq('id', product.id)
    setSavingId(null)

    if (error) {
      setToast({ type: 'error', text: 'Could not update price. Try again.' })
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, price: value } : p)))
    setToast({ type: 'success', text: `Price updated for ${product.name}.` })
    cancelEdit()
  }

  // ── Precise-edit modal ────────────────────────────────────────────────
  const openModal = (product: Product) => {
    setModalTarget(product)
    setModalPrice(String(product.price))
    setModalError(null)
  }

  const closeModal = () => {
    setModalTarget(null)
    setModalPrice('')
    setModalError(null)
  }

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTarget) return

    const value = Number(modalPrice)
    if (modalPrice.trim() === '' || isNaN(value) || value < 0) {
      setModalError('Enter a valid price.')
      return
    }

    setModalSaving(true)
    const { error } = await supabase.from('products').update({ price: value }).eq('id', modalTarget.id)
    setModalSaving(false)

    if (error) {
      setModalError(error.message || 'Could not update price.')
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === modalTarget.id ? { ...p, price: value } : p)))
    setToast({ type: 'success', text: `Price updated for ${modalTarget.name}.` })
    closeModal()
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t find your vendor profile</h2>
        <p className="mt-2 text-sm text-slate-500">Please contact support if this keeps happening.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
          <Tag size={20} />
        </div>
        <div>
          <h1 className="text-xl text-white font-bold tracking-tight text-slate-900 sm:text-2xl">Pricing</h1>
          <p className="text-sm text-slate-500">Set and update prices across your product catalog.</p>
        </div>
      </div>

      {/* ── Summary stat cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Package size={18} />}
          label="Total Products"
          value={stats.total.toString()}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Average Price"
          value={`₹${stats.avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          accent="from-violet-500/10 to-violet-500/5 text-violet-600"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Highest Price"
          value={`₹${stats.highest.toLocaleString('en-IN')}`}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
        <StatCard
          icon={<TrendingDown size={18} />}
          label="Lowest Price"
          value={`₹${stats.lowest.toLocaleString('en-IN')}`}
          accent="from-amber-500/10 to-amber-500/5 text-amber-600"
        />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15 sm:w-64"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setSortMenuOpen((v) => !v)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer sm:w-auto"
          >
            <ArrowUpDown size={13} />
            {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
          </button>
          <AnimatePresence>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSortKey(opt.key)
                        setSortMenuOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium cursor-pointer ${
                        sortKey === opt.key ? 'bg-[#1857D6]/8 text-[#1857D6]' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.key === 'price_desc' && <TrendingDown size={13} />}
                      {opt.key === 'price_asc' && <TrendingUp size={13} />}
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Pricing table ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <Tag size={26} />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {products.length === 0 ? 'No products yet' : 'No products match your search'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {products.length === 0 ? 'Add products first, then set their pricing here.' : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Current Price</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => {
                  const isEditing = editingId === product.id
                  const isSaving = savingId === product.id

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                              <ImageOff size={16} />
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            product.stock === 0
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : product.stock <= 5
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <Boxes size={12} />
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <IndianRupee size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(product)
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                className="w-28 rounded-lg border border-[#1857D6]/40 bg-white py-1.5 pl-7 pr-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1857D6]/20"
                              />
                            </div>
                            <button
                              onClick={() => commitEdit(product)}
                              disabled={isSaving}
                              aria-label="Save price"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#1857D6] text-white hover:bg-[#0B2E7A] disabled:opacity-60 cursor-pointer"
                            >
                              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              aria-label="Cancel"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product)}
                            className="inline-flex items-center gap-1 text-base font-bold text-slate-800 hover:text-[#1857D6] cursor-pointer"
                          >
                            <IndianRupee size={14} />
                            {product.price.toLocaleString('en-IN')}
                            <Pencil size={12} className="ml-1 text-slate-300" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end">
                          <button
                            onClick={() => openModal(product)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Precise edit modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <button
                onClick={closeModal}
                aria-label="Close"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mb-3 flex items-center gap-3">
                {modalTarget.image_url ? (
                  <img
                    src={modalTarget.image_url}
                    alt={modalTarget.name}
                    className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    <ImageOff size={18} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 line-clamp-1">{modalTarget.name}</h3>
                  <p className="text-xs text-slate-400">
                    Current: ₹{modalTarget.price.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleModalSave} className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  New Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={modalPrice}
                    onChange={(e) => setModalPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-lg font-semibold text-slate-800 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15"
                  />
                </div>

                {modalError && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] py-2.5 text-sm font-semibold text-white hover:shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {modalSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {modalSaving ? 'Saving...' : 'Save Price'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}