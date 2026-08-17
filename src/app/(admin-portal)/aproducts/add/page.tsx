'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, CheckCircle2, UploadCloud, ChevronDown, Image as ImageIcon, Coins } from 'lucide-react'

// TypeScript Interfaces
interface Category {
  id: string
  name: string
}

interface Subcategory {
  id: string
  category_id: string
  name: string
}

export default function AddProductPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '0', 
    stock: '0',
    category: '',    // Storing the category name
    sub_category: '', // Storing the sub-category name
    image_url: ''
  })

  // ── Fetch Categories & Subcategories ─────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const [catRes, subCatRes] = await Promise.all([
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('subcategories').select('id, category_id, name').eq('is_active', true).order('sort_order', { ascending: true })
      ])
      
      if (catRes.data) setCategories(catRes.data)
      if (subCatRes.data) setSubcategories(subCatRes.data)
    }
    fetchData()
  }, [supabase])

  // Find the selected category ID to filter subcategories correctly
  const selectedCatId = categories.find(c => c.name === form.category)?.id
  const filteredSubcategories = subcategories.filter(sc => sc.category_id === selectedCatId)

  // ── Handle Image Upload ──────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
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

      setForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
    } else {
      alert('Failed to upload image. Make sure your storage bucket policies are set.')
    }
    
    setUploadingImage(false)
  }

  // ── Handle Add Product ───────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const parsedPrice = parseInt(form.price)
    const parsedStock = parseInt(form.stock)

    // Insert to DB (Now saving category and sub_category strings!)
    const { error } = await supabase.from('products').insert([{
      name: form.name,
      description: form.description || null,
      price: isNaN(parsedPrice) ? 0 : parsedPrice, 
      stock: isNaN(parsedStock) ? 0 : parsedStock,
      category: form.category || null,       
      sub_category: form.sub_category || null, 
      image_url: form.image_url || null,
      is_active: true
    }])

    if (error) {
      console.error("Database Insert Error:", error)
      alert(`Failed to add product: ${error.message}`) 
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.push('/products')
  }

  return (
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mr-8 -mt-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
            <Plus size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Add New Product</h1>
            <p className="mt-1 text-sm text-slate-500">Create a new product listing with point values for your catalog.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleAdd} className="space-y-8">
          
          {/* Image Upload Area */}
          <div>
            <label className="mb-2.5 block text-sm font-semibold text-slate-700">Product Image</label>
            <div className="group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                disabled={uploadingImage}
              />
              
              {form.image_url ? (
                <>
                  <img src={form.image_url} alt="Preview" className="h-full w-full object-contain p-2" />
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                      <UploadCloud size={18} />
                      Change Image
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  {uploadingImage ? (
                    <>
                      <Loader2 size={36} className="animate-spin text-[#1857D6]" />
                      <span className="text-sm font-medium">Uploading image...</span>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <ImageIcon size={32} className="text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                        <p className="mt-1 text-xs text-slate-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Basic Details */}
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Product Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                required 
                placeholder="e.g. Premium Cotton T-Shirt"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10" 
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
              <textarea 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
                rows={4} 
                placeholder="Describe the product details, features, and benefits..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10" 
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Category & Organization */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
              <div className="relative">
                <select 
                  value={form.category} 
                  onChange={(e) => setForm({...form, category: e.target.value, sub_category: ''})} 
                  className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option> 
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Sub-Category</label>
              <div className="relative">
                <select 
                  value={form.sub_category} 
                  onChange={(e) => setForm({...form, sub_category: e.target.value})} 
                  disabled={!form.category}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">Select Sub-Category</option>
                  {filteredSubcategories.map(sc => (
                    <option key={sc.id} value={sc.name}>{sc.name}</option> 
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Points & Inventory */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Points Required</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Coins size={16} />
                </span>
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  value={form.price} 
                  onChange={(e) => setForm({...form, price: e.target.value})} 
                  required 
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10" 
                />
              </div>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Initial Stock</label>
              <input 
                type="number" 
                min="0"
                value={form.stock} 
                onChange={(e) => setForm({...form, stock: e.target.value})} 
                required 
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all focus:border-[#1857D6] focus:outline-none focus:ring-4 focus:ring-[#1857D6]/10" 
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={submitting || uploadingImage} 
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-7 py-4 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
              {submitting ? 'Publishing Product...' : 'Publish Product'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  )
}