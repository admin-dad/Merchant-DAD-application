// app/vendor/inventory/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Boxes,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  ImageOff,
  Minus,
  Plus,
  ArrowUpDown,
  PackageCheck,
  PackageX,
  PackageMinus,
  Package,
  X,
  Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
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

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type SortKey = 'name_asc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc'

const LOW_STOCK_THRESHOLD = 5

const STOCK_FILTERS: { key: StockFilter; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'all', label: 'All', icon: Boxes },
  { key: 'in_stock', label: 'In Stock', icon: PackageCheck },
  { key: 'low_stock', label: 'Low Stock', icon: PackageMinus },
  { key: 'out_of_stock', label: 'Out of Stock', icon: PackageX },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'stock_asc', label: 'Stock (Low to High)' },
  { key: 'stock_desc', label: 'Stock (High to Low)' },
  { key: 'price_asc', label: 'Price (Low to High)' },
  { key: 'price_desc', label: 'Price (High to Low)' },
]

export default function InventoryPage() {
  const supabase = createClient()
// Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name_asc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  // Inline adjust state — tracks which row is being edited + pending value
  const [adjusting, setAdjusting] = useState<Record<string, number>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Manual stock-set modal
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    const total = products.length
    const inStock = products.filter((p) => p.stock > LOW_STOCK_THRESHOLD).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0)
    return { total, inStock, lowStock, outOfStock, totalUnits }
  }, [products])

  // ── Filter + sort ────────────────────────────────────────────────────
  const visibleProducts = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (stockFilter === 'in_stock') list = list.filter((p) => p.stock > LOW_STOCK_THRESHOLD)
    if (stockFilter === 'low_stock') list = list.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
    if (stockFilter === 'out_of_stock') list = list.filter((p) => p.stock === 0)

    switch (sortKey) {
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'stock_asc':
        list.sort((a, b) => a.stock - b.stock)
        break
      case 'stock_desc':
        list.sort((a, b) => b.stock - a.stock)
        break
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
    }

    return list
  }, [products, search, stockFilter, sortKey])

  // ── Quick +/- adjust (optimistic, saves on commit) ──────────────────
  const getDisplayStock = (product: Product) =>
    adjusting[product.id] !== undefined ? adjusting[product.id] : product.stock

  const bumpStock = (product: Product, delta: number) => {
    const current = getDisplayStock(product)
    const next = Math.max(0, current + delta)
    setAdjusting((prev) => ({ ...prev, [product.id]: next }))
  }

  const commitStock = async (product: Product) => {
    const pending = adjusting[product.id]
    if (pending === undefined || pending === product.stock) {
      setAdjusting((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      return
    }

    setSavingId(product.id)
    const { error } = await supabase.from('products').update({ stock: pending }).eq('id', product.id)
    setSavingId(null)

    if (error) {
      setToast({ type: 'error', text: 'Could not update stock. Try again.' })
      setAdjusting((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: pending } : p)))
    setAdjusting((prev) => {
      const next = { ...prev }
      delete next[product.id]
      return next
    })
  }

  // ── Manual set-stock modal ────────────────────────────────────────────
  const openEditModal = (product: Product) => {
    setEditTarget(product)
    setEditValue(String(product.stock))
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const value = Number(editValue)
    if (!/^\d+$/.test(editValue.trim()) || value < 0) {
      setToast({ type: 'error', text: 'Enter a valid whole number.' })
      return
    }

    setEditSaving(true)
    const { error } = await supabase.from('products').update({ stock: value }).eq('id', editTarget.id)
    setEditSaving(false)

    if (error) {
      setToast({ type: 'error', text: 'Could not update stock. Try again.' })
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === editTarget.id ? { ...p, stock: value } : p)))
    setToast({ type: 'success', text: `Stock updated for ${editTarget.name}.` })
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget || !vendorId) return
    setDeleting(true)

    try {
      // Best-effort: remove the image from storage first
      if (deleteTarget.image_url) {
        const marker = '/product-images/'
        const idx = deleteTarget.image_url.indexOf(marker)
        if (idx !== -1) {
          const path = deleteTarget.image_url.slice(idx + marker.length)
          await supabase.storage.from('product-images').remove([path])
        }
      }

      const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
      if (error) throw error

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setToast({ type: 'success', text: `${deleteTarget.name} deleted.` })
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete product.',
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
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
          <Boxes size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight text-slate-900 sm:text-2xl">Inventory</h1>
          <p className="text-sm text-slate-500">Track and update stock levels across your catalog.</p>
        </div>
      </div>

      {/* ── Summary stat cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Package size={18} />}
          label="Total Products"
          value={stats.total}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<PackageCheck size={18} />}
          label="In Stock"
          value={stats.inStock}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
        <StatCard
          icon={<PackageMinus size={18} />}
          label="Low Stock"
          value={stats.lowStock}
          accent="from-amber-500/10 to-amber-500/5 text-amber-600"
        />
        <StatCard
          icon={<PackageX size={18} />}
          label="Out of Stock"
          value={stats.outOfStock}
          accent="from-rose-500/10 to-rose-500/5 text-rose-600"
        />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Stock status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STOCK_FILTERS.map((f) => {
            const Icon = f.icon
            const active = stockFilter === f.key
            const count =
              f.key === 'all'
                ? stats.total
                : f.key === 'in_stock'
                ? stats.inStock
                : f.key === 'low_stock'
                ? stats.lowStock
                : stats.outOfStock
            return (
              <button
                key={f.key}
                onClick={() => setStockFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon size={13} />
                {f.label}
                <span className={`ml-0.5 rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15 sm:w-52"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowUpDown size={13} />
              Sort
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
                    className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortKey(opt.key)
                          setSortMenuOpen(false)
                        }}
                        className={`flex w-full items-center px-3.5 py-2 text-left text-xs font-medium cursor-pointer ${
                          sortKey === opt.key ? 'bg-[#1857D6]/8 text-[#1857D6]' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Inventory table ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <Boxes size={26} />
            </div>
            <p className="text-sm font-medium text-slate-600">No products match your filters</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => {
                  const displayStock = getDisplayStock(product)
                  const isDirty = adjusting[product.id] !== undefined && adjusting[product.id] !== product.stock
                  const isSaving = savingId === product.id

                  const statusMeta =
                    displayStock === 0
                      ? { label: 'Out of stock', cls: 'border-rose-200 bg-rose-50 text-rose-700' }
                      : displayStock <= LOW_STOCK_THRESHOLD
                      ? { label: 'Low stock', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
                      : { label: 'In stock', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }

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
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-0.5">
                          <IndianRupee size={12} />
                          {product.price.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => bumpStock(product, -1)}
                            disabled={displayStock === 0 || isSaving}
                            aria-label="Decrease stock"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <span
                            className={`w-8 text-center text-sm font-semibold tabular-nums ${
                              isDirty ? 'text-[#1857D6]' : 'text-slate-800'
                            }`}
                          >
                            {displayStock}
                          </span>
                          <button
                            onClick={() => bumpStock(product, 1)}
                            disabled={isSaving}
                            aria-label="Increase stock"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>

                          {isDirty && (
                            <button
                              onClick={() => commitStock(product)}
                              disabled={isSaving}
                              className="ml-1 inline-flex items-center gap-1 rounded-md bg-[#1857D6] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0B2E7A] disabled:opacity-60 cursor-pointer"
                            >
                              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                    <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(product)}
                            aria-label="Set exact stock"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1857D6] cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            aria-label="Delete product"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
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

      {/* ── Set exact stock modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditTarget(null)}
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
                onClick={() => setEditTarget(null)}
                aria-label="Close"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1857D6]/10 text-[#1857D6]">
                <Boxes size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Update Stock</h3>
              <p className="mt-1 text-sm text-slate-500">
                Set the exact quantity for <strong className="text-slate-700">{editTarget.name}</strong>.
              </p>

              <form onSubmit={handleEditSave} className="mt-4">
                <input
                  type="number"
                  min="0"
                  step="1"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-800 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15"
                />

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] py-2.5 text-sm font-semibold text-white hover:shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {editSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {editSaving ? 'Saving...' : 'Save'}
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


      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <Trash2 size={22} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete this product?</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                <strong className="text-slate-700">{deleteTarget.name}</strong> and its stock record
                will be permanently removed. This can&apos;t be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
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
  value: number
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