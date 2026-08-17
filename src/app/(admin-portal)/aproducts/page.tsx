'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Package,
  Loader2,
  AlertCircle,
  Search,
  Pencil,
  Trash2,
  Image as ImageIcon,
  X,
  Save,
  ChevronDown,
  Filter,
  Coins,
  UploadCloud, // Added for the upload button
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Product {
  id: string
  vendor_id: string | null
  name: string
  description: string | null
  category: string | null
  sub_category: string | null
  price: string | number
  stock: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

export default function AdminProductsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  
  // Database Categories
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  
  // ── Filters & Search State ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterSubCategory, setFilterSubCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '0',
    stock: '0',
    category: '',
    sub_category: '',
    image_url: '', // Added image_url state
    is_active: true
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Fetch Products & Categories ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const [prodRes, catRes, subCatRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('subcategories').select('id, category_id, name').eq('is_active', true).order('sort_order', { ascending: true })
      ])

      if (prodRes.error) {
        setError('Failed to load products.')
      } else {
        setProducts(prodRes.data as Product[])
      }

      if (catRes.data) setCategories(catRes.data)
      if (subCatRes.data) setSubcategories(subCatRes.data)

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // ── Reset Subcategory when Category changes ──────────────────────────
  useEffect(() => {
    setFilterSubCategory('All')
  }, [filterCategory])

  // ── Dynamic Subcategories based on selected Category ─────────────────
  const availableFilterSubcats = useMemo(() => {
    if (filterCategory === 'All') return subcategories
    const selectedCat = categories.find(c => c.name === filterCategory)
    if (!selectedCat) return []
    return subcategories.filter(sc => sc.category_id === selectedCat.id)
  }, [filterCategory, categories, subcategories])

  const availableEditSubcats = useMemo(() => {
    const selectedCat = categories.find(c => c.name === editForm.category)
    if (!selectedCat) return []
    return subcategories.filter(sc => sc.category_id === selectedCat.id)
  }, [editForm.category, categories, subcategories])

  // ── Handle Delete Product ────────────────────────────────────────────
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    setDeletingId(productId)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== productId))
    } else {
      alert('Failed to delete product.')
    }
    
    setDeletingId(null)
  }

  // ── Handle Edit Product (Open Modal & Populate Form) ─────────────────
  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
      category: product.category || '',
      sub_category: product.sub_category || '',
      image_url: product.image_url || '', // Populate existing image
      is_active: product.is_active
    })
    setIsEditModalOpen(true)
  }

  // ── Handle Edit Image Upload ─────────────────────────────────────────
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingEditImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (!error) {
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      setEditForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
    } else {
      alert('Failed to upload image. Make sure your storage bucket policies are set.')
    }
    
    setUploadingEditImage(false)
  }

  // ── Handle Save Edit (Update Database) ───────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setSavingEdit(true)

    const { data, error } = await supabase
      .from('products')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        price: parseInt(editForm.price) || 0,
        stock: parseInt(editForm.stock) || 0,
        category: editForm.category || null,
        sub_category: editForm.sub_category || null,
        image_url: editForm.image_url || null, // Include updated image URL
        is_active: editForm.is_active
      })
      .eq('id', editingProduct.id)
      .select()
      .single()

    if (!error && data) {
      setProducts(prev => prev.map(p => p.id === data.id ? data as Product : p))
      setIsEditModalOpen(false)
      setEditingProduct(null)
    } else {
      alert('Failed to update product.')
    }

    setSavingEdit(false)
  }

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory
    const matchesSubCategory = filterSubCategory === 'All' || p.sub_category === filterSubCategory
    const matchesStatus = filterStatus === 'All' || 
                          (filterStatus === 'Active' && p.is_active) || 
                          (filterStatus === 'Inactive' && !p.is_active)

    return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus
  })

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
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Package size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Products Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View, edit, filter, and manage your product catalog points.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 hidden xl:flex">
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
              disabled={availableFilterSubcats.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="All">All Sub-Categories</option>
              {availableFilterSubcats.map(sub => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[120px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">All Products</h2>
            <p className="text-xs text-slate-500">Showing {filteredProducts.length} of {products.length} products.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Product</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Category</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Sub-Category</th>
                <th className="py-3 px-4 font-medium">Points Required</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Stock</th>
                <th className="py-3 px-4 font-medium text-right">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Product Info & Image */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Category */}
                    <td className="py-4 px-4 hidden md:table-cell text-slate-600">{p.category || 'N/A'}</td>
                    
                    {/* Sub-Category */}
                    <td className="py-4 px-4 hidden lg:table-cell text-slate-600">{p.sub_category || 'N/A'}</td>
                    
                    {/* Points */}
                    <td className="py-4 px-4 font-bold text-[#1857D6]">
                      <span className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full">
                        <Coins size={13} />
                        {Number(p.price)} Pts
                      </span>
                    </td>
                    
                    {/* Stock */}
                    <td className="py-4 px-4 hidden sm:table-cell text-slate-600">{p.stock}</td>
                    
                    {/* Status */}
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(p)}
                          className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#1857D6] hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Product"
                        >
                          {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsEditModalOpen(false)}
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
                onClick={() => setIsEditModalOpen(false)}
                className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="max-h-[calc(90vh-6px)] overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
                <div className="mb-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#1857D6]">
                    <Pencil size={13} />
                    Edit Product
                  </div>
                  <h2 className="text-2xl font-semibold text-[#0B0F19]">Update Details</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Make changes to the product details and save.</p>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  
                  {/* Image Edit Upload Area */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Product Image</label>
                    <div className="group relative flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleEditImageUpload} 
                        className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                        disabled={uploadingEditImage || savingEdit}
                      />
                      
                      {editForm.image_url ? (
                        <>
                          <img src={editForm.image_url} alt="Preview" className="h-full w-full object-contain p-2" />
                          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                              <UploadCloud size={16} />
                              Change Image
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          {uploadingEditImage ? (
                            <>
                              <Loader2 size={24} className="animate-spin text-[#1857D6]" />
                              <span className="text-xs font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
                                <ImageIcon size={20} className="text-slate-400" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">Click to upload image</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Product Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                      <div className="relative">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value, sub_category: ''})}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sub-Category</label>
                      <div className="relative">
                        <select
                          value={editForm.sub_category}
                          onChange={(e) => setEditForm({...editForm, sub_category: e.target.value})}
                          disabled={!editForm.category || availableEditSubcats.length === 0}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Sub-Category</option>
                          {availableEditSubcats.map(sub => (
                            <option key={sub.id} value={sub.name}>{sub.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Points Required</label>
                      <input
                        type="number"
                        step="1"
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Stock</label>
                      <input
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="text-sm font-medium text-slate-700">Product is Active</label>
                    <button
                      type="button"
                      onClick={() => setEditForm({...editForm, is_active: !editForm.is_active})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editForm.is_active ? 'bg-[#7BC142]' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={savingEdit || uploadingEditImage}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer mt-4"
                  >
                    {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}