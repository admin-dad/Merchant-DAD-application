'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Coins, 
  Loader2, 
  Save, 
  Pencil, 
  X, 
  Search, 
  Filter, 
  ChevronDown, 
  Image as ImageIcon,
  Package
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface Product { 
  id: string; 
  name: string; 
  price: string | number; // Storing points internally in the price column
  image_url: string | null;
  category: string | null;
  sub_category: string | null;
  created_at: string;
}

export default function PointsManagementPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  
  // Categories from DB
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])

  // Edit State
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterSubCategory, setFilterSubCategory] = useState('All')
  const [sortOrder, setSortOrder] = useState('newest')

  // ── Fetch Data ───────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const [prodRes, catRes, subCatRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('subcategories').select('id, category_id, name').eq('is_active', true).order('sort_order', { ascending: true })
      ])
      
      if (prodRes.error) console.error("Error fetching products:", prodRes.error)
      if (prodRes.data) setProducts(prodRes.data as Product[])
      if (catRes.data) setCategories(catRes.data)
      if (subCatRes.data) setSubcategories(subCatRes.data)
        
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  // ── Handle Points Update ─────────────────────────────────────────────
  const handleUpdate = async (id: string, value: string) => {
    setUpdatingId(id)
    const numVal = parseInt(value, 10) // Whole numbers for points
    if (isNaN(numVal) || numVal < 0) { 
      alert('Please enter a valid positive number of points'); 
      setUpdatingId(null); 
      return 
    }
    
    const { error } = await supabase.from('products').update({ price: numVal }).eq('id', id)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, price: numVal } : p))
    } else {
      alert('Failed to update points.')
    }
    
    setUpdatingId(null)
    setEditingId(null)
  }

  // ── Reset Subcategory when Category changes ──────────────────────────
  useEffect(() => {
    setFilterSubCategory('All')
  }, [filterCategory])

  // ── Dynamic Subcategories ────────────────────────────────────────────
  const availableSubcats = useMemo(() => {
    if (filterCategory === 'All') return subcategories
    const selectedCat = categories.find(c => c.name === filterCategory)
    if (!selectedCat) return []
    return subcategories.filter(sc => sc.category_id === selectedCat.id)
  }, [filterCategory, categories, subcategories])

  // ── Filter and Sort Logic ────────────────────────────────────────────
  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      const safeName = p.name || ''
      const matchesSearch = safeName.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCat = filterCategory === 'All' || p.category === filterCategory
      const matchesSubCat = filterSubCategory === 'All' || p.sub_category === filterSubCategory
      
      return matchesSearch && matchesCat && matchesSubCat
    })

    result.sort((a, b) => {
      const nameA = a.name || ''
      const nameB = b.name || ''
      const pointsA = Number(a.price) || 0
      const pointsB = Number(b.price) || 0

      if (sortOrder === 'a_z') return nameA.localeCompare(nameB)
      if (sortOrder === 'z_a') return nameB.localeCompare(nameA)
      if (sortOrder === 'points_high') return pointsB - pointsA
      if (sortOrder === 'points_low') return pointsA - pointsB
      
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA // newest
    })

    return result
  }, [products, searchQuery, filterCategory, filterSubCategory, sortOrder])

  // ── Render Loading State ─────────────────────────────────────────────
  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin text-[#1857D6]" /></div>

  return (
    <div className="mx-auto max-w-8xl bg-white px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20"><Coins size={30} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Points Management</h1>
            <p className="mt-1 text-sm text-slate-500">Track and update the point values required for products.</p>
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
            placeholder="Search products by name..."
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
          <div className="relative min-w-[130px]">
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
          <div className="relative min-w-[140px]">
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

          {/* Sort Order */}
          <div className="relative min-w-[140px]">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
            >
              <option value="newest">Newest First</option>
              <option value="points_high">Points: High to Low</option>
              <option value="points_low">Points: Low to High</option>
              <option value="a_z">Name: A to Z</option>
              <option value="z_a">Name: Z to A</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Points Directory</h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Showing {processedProducts.length} items
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Product Details</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Current Points</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16">
                    <Package size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-900">No products found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search.</p>
                  </td>
                </tr>
              ) : processedProducts.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Image & Details */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50 shadow-sm">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name || 'Product Image'} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.name || 'Unnamed Product'}</p>
                        {p.category && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {p.category} {p.sub_category ? ` • ${p.sub_category}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Points Input/Display */}
                  <td className="py-4 px-4">
                    {editingId === p.id ? (
                      <div className="relative w-28">
                        <input 
                          type="number" 
                          step="1"
                          min="0"
                          defaultValue={p.price || 0} 
                          id={`price-${p.id}`} 
                          className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-1.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/20" 
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-[#1857D6] bg-blue-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <Coins size={13} />
                        {Number(p.price || 0)} Pts
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === p.id ? (
                        <>
                          <button 
                            onClick={() => handleUpdate(p.id, (document.getElementById(`price-${p.id}`) as HTMLInputElement).value)} 
                            disabled={updatingId === p.id} 
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {updatingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="flex items-center gap-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setEditingId(p.id)} 
                          className="flex items-center gap-1.5 rounded-lg bg-[#1857D6]/10 text-[#1857D6] hover:bg-[#1857D6]/20 border border-[#1857D6]/20 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                        >
                          <Pencil size={14} />
                          Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}