// app/vendor/products/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  ImagePlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  IndianRupee,
  Boxes,
  ImageOff,
  ArrowUpDown,
  PackageCheck,
  PackageMinus,
  PackageX,
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

interface ProductFormState {
  name: string
  description: string
  price: string
  stock: string
}

const EMPTY_FORM: ProductFormState = { name: '', description: '', price: '', stock: '' }

type FormErrors = Partial<Record<keyof ProductFormState, string>>
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type SortKey = 'newest' | 'name_asc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'

const LOW_STOCK_THRESHOLD = 5

const STOCK_FILTERS: { key: StockFilter; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'all', label: 'All', icon: Boxes },
  { key: 'in_stock', label: 'In Stock', icon: PackageCheck },
  { key: 'low_stock', label: 'Low Stock', icon: PackageMinus },
  { key: 'out_of_stock', label: 'Out of Stock', icon: PackageX },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'price_asc', label: 'Price (Low to High)' },
  { key: 'price_desc', label: 'Price (High to Low)' },
  { key: 'stock_asc', label: 'Stock (Low to High)' },
  { key: 'stock_desc', label: 'Stock (High to Low)' },
]
export default function ProductsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Load vendor + products ────────────────────────────────────────────
  const loadProducts = useCallback(
    async (vId: string) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vId)
        .order('created_at', { ascending: false })

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
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Modal helpers ───────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalError(null)
    setImageFile(null)
    setImagePreview(null)
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
    })
    setErrors({})
    setModalError(null)
    setImageFile(null)
    setImagePreview(product.image_url)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setTimeout(() => {
      setEditingProduct(null)
      setForm(EMPTY_FORM)
      setImageFile(null)
      setImagePreview(null)
      setModalError(null)
    }, 250)
  }

  const update = (field: keyof ProductFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (modalError) setModalError(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setModalError('Please select a valid image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalError('Image must be smaller than 5MB.')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    if (modalError) setModalError(null)
  }

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!form.name.trim()) next.name = 'Product name is required'

    if (!form.price.trim()) {
      next.price = 'Price is required'
    } else if (isNaN(Number(form.price)) || Number(form.price) < 0) {
      next.price = 'Enter a valid price'
    }

    if (!form.stock.trim()) {
      next.stock = 'Stock quantity is required'
    } else if (!/^\d+$/.test(form.stock.trim())) {
      next.stock = 'Enter a whole number'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ── Save (create or update) ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) return
    if (!validate()) return

    setSaving(true)
    setModalError(null)

    try {
      let imageUrl = editingProduct?.image_url || null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${vendorId}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path)

        imageUrl = publicUrlData.publicUrl
      }

      const payload = {
        vendor_id: vendorId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock),
        image_url: imageUrl,
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
        if (error) throw error
        setToast({ type: 'success', text: 'Product updated successfully.' })
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        setToast({ type: 'success', text: 'Product added successfully.' })
      }

      await loadProducts(vendorId)
      closeModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || !vendorId) return
    setDeleting(true)

    try {
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

      setToast({ type: 'success', text: 'Product deleted.' })
      await loadProducts(vendorId)
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

  const stockCounts = useMemo(() => {
    const inStock = products.filter((p) => p.stock > LOW_STOCK_THRESHOLD).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    return { all: products.length, in_stock: inStock, low_stock: lowStock, out_of_stock: outOfStock }
  }, [products])

  const filteredProducts = useMemo(() => {
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
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'stock_asc':
        list.sort((a, b) => a.stock - b.stock)
        break
      case 'stock_desc':
        list.sort((a, b) => b.stock - a.stock)
        break
      case 'newest':
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    return list
  }, [products, search, stockFilter, sortKey])

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl text-white font-bold tracking-tight text-slate-900 sm:text-2xl">Product Management</h1>
            <p className="text-sm text-slate-500">
              {products.length} {products.length === 1 ? 'product' : 'products'} listed
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
        >
          <Plus size={17} />
          Add Product
        </button>
      </div>
{/* ── Summary stat cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Package size={18} />}
          label="Total Products"
          value={stockCounts.all}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<PackageCheck size={18} />}
          label="In Stock"
          value={stockCounts.in_stock}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
        <StatCard
          icon={<PackageMinus size={18} />}
          label="Low Stock"
          value={stockCounts.low_stock}
          accent="from-amber-500/10 to-amber-500/5 text-amber-600"
        />
        <StatCard
          icon={<PackageX size={18} />}
          label="Out of Stock"
          value={stockCounts.out_of_stock}
          accent="from-rose-500/10 to-rose-500/5 text-rose-600"
        />
      </div>
      {/* Search */}
   {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Stock status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STOCK_FILTERS.map((f) => {
            const Icon = f.icon
            const active = stockFilter === f.key
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
                  {stockCounts[f.key]}
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
      {/* ── Card Grid — 3 per row ──────────────────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-20 text-center shadow-sm">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <Package size={26} />
          </div>
        <p className="text-sm font-medium text-slate-600">
            {products.length === 0 ? 'No products yet' : 'No products match your filters'}
          </p>
          {products.length === 0 && (
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1857D6]/10 px-4 py-2 text-sm font-semibold text-[#1857D6] hover:bg-[#1857D6]/15 cursor-pointer"
            >
              <Plus size={15} /> Add your first product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.03 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageOff size={32} />
                  </div>
                )}

                {/* Stock badge — top left, floating on image */}
                <span
                  className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${
                    product.stock === 0
                      ? 'border-rose-200 bg-rose-50/95 text-rose-700'
                      : product.stock <= 5
                      ? 'border-amber-200 bg-amber-50/95 text-amber-700'
                      : 'border-emerald-200 bg-emerald-50/95 text-emerald-700'
                  }`}
                >
                  <Boxes size={12} />
                  {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
                </span>

                {/* Hover actions — top right, over image */}
                <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    onClick={() => openEditModal(product)}
                    aria-label="Edit product"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white hover:text-[#1857D6] cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(product)}
                    aria-label="Delete product"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{product.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
                  {product.description || 'No description added.'}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-0.5 text-base font-bold text-slate-900">
                    <IndianRupee size={14} />
                    {product.price.toLocaleString('en-IN')}
                  </span>

                  {/* Edit/Delete also available inline for touch devices without hover */}
                  <div className="flex gap-1 sm:hidden">
                    <button
                      onClick={() => openEditModal(product)}
                      aria-label="Edit product"
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
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
              <button
                onClick={closeModal}
                aria-label="Close"
                className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <h2 className="mb-5 pr-8 text-xl font-semibold text-[#0B0F19] sm:text-2xl">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Image upload */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product Image
                    </label>
                    <label
                      htmlFor="product-image"
                      className="flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-[#1857D6]/40 hover:bg-slate-100/60"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                          <ImagePlus size={24} />
                          <span className="text-xs font-medium">Click to upload (max 5MB)</span>
                        </div>
                      )}
                    </label>
                    <input
                      id="product-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g. Organic Basmati Rice 5kg"
                      className={inputClass(!!errors.name)}
                    />
                    {errors.name && <p className="mt-1 text-xs font-medium text-red-500">{errors.name}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                      placeholder="Short description of the product..."
                      rows={3}
                      className={`${inputClass(false)} resize-none`}
                    />
                  </div>

                  {/* Price + Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => update('price', e.target.value)}
                        placeholder="0.00"
                        className={inputClass(!!errors.price)}
                      />
                      {errors.price && <p className="mt-1 text-xs font-medium text-red-500">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={(e) => update('stock', e.target.value)}
                        placeholder="0"
                        className={inputClass(!!errors.stock)}
                      />
                      {errors.stock && <p className="mt-1 text-xs font-medium text-red-500">{errors.stock}</p>}
                    </div>
                  </div>

                  {modalError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingProduct ? 'Save Changes' : 'Add Product'}</span>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
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
                <strong className="text-slate-700">{deleteTarget.name}</strong> will be permanently
                removed. This can&apos;t be undone.
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

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800',
    'placeholder:text-slate-400 transition-colors duration-200',
    'focus:bg-white focus:outline-none focus:ring-2',
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-[#1857D6] focus:ring-[#1857D6]/15',
  ].join(' ')
}

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