// app/admincategories/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderTree,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Tag,
  Eye,
  EyeOff,
  CheckCircle2,
  ListTree,
  IndianRupee,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface Subcategory {
  id: string
  category_id: string
  name: string
  scan_amount: number
  sort_order: number
  is_active: boolean
  created_at: string
}

interface Category {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  subcategories: Subcategory[]
}

type CategoryModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; category: Category }

type SubcategoryModalState =
  | { mode: 'closed' }
  | { mode: 'create'; categoryId: string }
  | { mode: 'edit'; categoryId: string; subcategory: Subcategory }

type DeleteTarget =
  | null
  | { type: 'category'; id: string; name: string }
  | { type: 'subcategory'; id: string; name: string }

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const [categoryModal, setCategoryModal] = useState<CategoryModalState>({ mode: 'closed' })
  const [subcategoryModal, setSubcategoryModal] = useState<SubcategoryModalState>({ mode: 'closed' })
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  // ── Load ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('id', user.id)
      .single()

    if (adminError || !admin) {
      setAuthorized(false)
      setLoading(false)
      return
    }

    setAuthorized(true)

    const { data, error: catError } = await supabase
      .from('categories')
      .select(
        'id, name, sort_order, is_active, created_at, subcategories ( id, category_id, name, scan_amount, sort_order, is_active, created_at )'
      )
      .order('sort_order', { ascending: true })

    if (!catError && data) {
      const sorted = (data as unknown as Category[]).map((c) => ({
        ...c,
        subcategories: [...c.subcategories].sort((a, b) => a.sort_order - b.sort_order),
      }))
      setCategories(sorted)
    } else if (catError) {
      setPageError(catError.message)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Derived ───────────────────────────────────────────────────────
  const visibleCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.trim().toLowerCase()
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    )
  }, [categories, search])

  const stats = useMemo(() => {
    const totalCategories = categories.length
    const activeCategories = categories.filter((c) => c.is_active).length
    const totalSubcategories = categories.reduce((sum, c) => sum + c.subcategories.length, 0)
    return { totalCategories, activeCategories, totalSubcategories }
  }, [categories])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Category CRUD ────────────────────────────────────────────────
  const saveCategory = async (values: { name: string; is_active: boolean }) => {
    setSaving(true)
    setPageError(null)
    try {
      if (categoryModal.mode === 'create') {
        const nextOrder =
          categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1
        const { error } = await supabase.from('categories').insert({
          name: values.name.trim(),
          is_active: values.is_active,
          sort_order: nextOrder,
        })
        if (error) throw error
      } else if (categoryModal.mode === 'edit') {
        const { error } = await supabase
          .from('categories')
          .update({
            name: values.name.trim(),
            is_active: values.is_active,
          })
          .eq('id', categoryModal.category.id)
        if (error) throw error
      }
      setCategoryModal({ mode: 'closed' })
      await loadAll()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  // ── Subcategory CRUD ─────────────────────────────────────────────
  const saveSubcategory = async (values: { name: string; scan_amount: number; is_active: boolean }) => {
    setSaving(true)
    setPageError(null)
    try {
      if (subcategoryModal.mode === 'create') {
        const parent = categories.find((c) => c.id === subcategoryModal.categoryId)
        const nextOrder =
          parent && parent.subcategories.length > 0
            ? Math.max(...parent.subcategories.map((s) => s.sort_order)) + 1
            : 1
        const { error } = await supabase.from('subcategories').insert({
          category_id: subcategoryModal.categoryId,
          name: values.name.trim(),
          scan_amount: values.scan_amount,
          is_active: values.is_active,
          sort_order: nextOrder,
        })
        if (error) throw error
      } else if (subcategoryModal.mode === 'edit') {
        const { error } = await supabase
          .from('subcategories')
          .update({
            name: values.name.trim(),
            scan_amount: values.scan_amount,
            is_active: values.is_active,
          })
          .eq('id', subcategoryModal.subcategory.id)
        if (error) throw error
      }
      setSubcategoryModal({ mode: 'closed' })
      await loadAll()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not save subcategory.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete (category or subcategory) ────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setPageError(null)
    try {
      const table = deleteTarget.type === 'category' ? 'categories' : 'subcategories'
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id)
      if (error) throw error
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setSaving(false)
    }
  }

  // ── Quick toggle active state ───────────────────────────────────
  const toggleCategoryActive = async (category: Category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)
    if (!error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c))
      )
    }
  }

  const toggleSubcategoryActive = async (sub: Subcategory) => {
    const { error } = await supabase
      .from('subcategories')
      .update({ is_active: !sub.is_active })
      .eq('id', sub.id)
    if (!error) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === sub.category_id
            ? {
                ...c,
                subcategories: c.subcategories.map((s) =>
                  s.id === sub.id ? { ...s, is_active: !s.is_active } : s
                ),
              }
            : c
        )
      )
    }
  }

  // ── Render states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-md shadow-blue-500/20">
            <FolderTree size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Categories</h1>
            <p className="text-sm text-slate-500">Manage business categories & sub-categories used across the platform.</p>
          </div>
        </div>
        <button
          onClick={() => setCategoryModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard
          icon={<Layers size={18} />}
          label="Total Categories"
          value={stats.totalCategories.toString()}
          accent="from-[#1857D6]/10 to-[#1857D6]/5 text-[#1857D6]"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Active Categories"
          value={stats.activeCategories.toString()}
          accent="from-emerald-500/10 to-emerald-500/5 text-emerald-600"
        />
        <StatCard
          icon={<ListTree size={18} />}
          label="Total Sub-categories"
          value={stats.totalSubcategories.toString()}
          accent="from-violet-500/10 to-violet-500/5 text-violet-600"
        />
      </div>

      {/* Page-level error */}
      {pageError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-5 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search category or sub-category..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1857D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1857D6]/15"
        />
      </div>

      {/* Category list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visibleCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <FolderTree size={26} />
            </div>
            <p className="text-sm font-medium text-slate-600">No categories found</p>
            <p className="mt-1 text-xs text-slate-400">Try a different search, or add a new category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleCategories.map((category) => {
              const isOpen = expanded.has(category.id)
              return (
                <div key={category.id}>
                  {/* Category row */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/10 text-[#1857D6]">
                      <Tag size={16} />
                    </div>

                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <p className="truncate text-sm font-semibold text-slate-800">{category.name}</p>
                      <p className="text-xs text-slate-400">
                        {category.subcategories.length}{' '}
                        {category.subcategories.length === 1 ? 'sub-category' : 'sub-categories'}
                      </p>
                    </button>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        category.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      onClick={() => toggleCategoryActive(category)}
                      title={category.is_active ? 'Deactivate' : 'Activate'}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {category.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => setCategoryModal({ mode: 'edit', category })}
                      title="Edit category"
                      className="text-slate-400 hover:text-[#1857D6] cursor-pointer"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'category', id: category.id, name: category.name })}
                      title="Delete category"
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Subcategories */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-50/60"
                      >
                        <div className="px-5 py-3 pl-16 space-y-1.5">
                          {category.subcategories.length === 0 ? (
                            <p className="py-2 text-xs text-slate-400">No sub-categories yet.</p>
                          ) : (
                            category.subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center gap-3 rounded-lg bg-white border border-slate-200/70 px-3.5 py-2"
                              >
                                <span className="flex-1 min-w-0 truncate text-sm text-slate-700">{sub.name}</span>

                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#1857D6]">
                                  <IndianRupee size={10} />
                                  {Number(sub.scan_amount).toFixed(2)} / scan
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                    sub.is_active
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {sub.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  onClick={() => toggleSubcategoryActive(sub)}
                                  title={sub.is_active ? 'Deactivate' : 'Activate'}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  {sub.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                  onClick={() =>
                                    setSubcategoryModal({
                                      mode: 'edit',
                                      categoryId: category.id,
                                      subcategory: sub,
                                    })
                                  }
                                  title="Edit sub-category"
                                  className="text-slate-400 hover:text-[#1857D6] cursor-pointer"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({ type: 'subcategory', id: sub.id, name: sub.name })
                                  }
                                  title="Delete sub-category"
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))
                          )}

                          <button
                            onClick={() => setSubcategoryModal({ mode: 'create', categoryId: category.id })}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#1857D6] hover:bg-[#1857D6]/5 cursor-pointer"
                          >
                            <Plus size={13} />
                            Add sub-category
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryFormModal
        state={categoryModal}
        saving={saving}
        onClose={() => setCategoryModal({ mode: 'closed' })}
        onSave={saveCategory}
      />
      <SubcategoryFormModal
        state={subcategoryModal}
        saving={saving}
        onClose={() => setSubcategoryModal({ mode: 'closed' })}
        onSave={saveSubcategory}
      />
      <ConfirmDeleteModal
        target={deleteTarget}
        saving={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
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

// ─────────────────────────────────────────────────────────────────────────
// Shared field wrapper (mirrors AuthModal's Field component)
// ─────────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-[#1857D6]">{icon}</span>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
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

// ─────────────────────────────────────────────────────────────────────────
// Modal shell (mirrors AuthModal's overlay/card pattern)
// ─────────────────────────────────────────────────────────────────────────

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <div className="mb-5 pr-8">
                <h2 className="text-xl font-semibold text-[#0B0F19]">{title}</h2>
                {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Category form modal
// ─────────────────────────────────────────────────────────────────────────

function CategoryFormModal({
  state,
  saving,
  onClose,
  onSave,
}: {
  state: CategoryModalState
  saving: boolean
  onClose: () => void
  onSave: (values: { name: string; is_active: boolean }) => void
}) {
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state.mode === 'edit') {
      setName(state.category.name)
      setIsActive(state.category.is_active)
    } else if (state.mode === 'create') {
      setName('')
      setIsActive(true)
    }
    setError(null)
  }, [state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Category name is required')
      return
    }
    onSave({ name, is_active: isActive })
  }

  return (
    <ModalShell
      open={state.mode !== 'closed'}
      title={state.mode === 'edit' ? 'Edit Category' : 'Add Category'}
      subtitle={
        state.mode === 'edit'
          ? 'Update this category\u2019s details.'
          : 'Create a new business category for merchants to select.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Category Name" icon={<Tag size={16} />} error={error || undefined}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. Kirana Store"
            className={inputClass(!!error)}
            autoFocus
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#1857D6] focus:ring-[#1857D6]/40"
          />
          <span>Active (visible to merchants during registration)</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : state.mode === 'edit' ? (
            'Save Changes'
          ) : (
            'Create Category'
          )}
        </button>
      </form>
    </ModalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Subcategory form modal
// ─────────────────────────────────────────────────────────────────────────

function SubcategoryFormModal({
  state,
  saving,
  onClose,
  onSave,
}: {
  state: SubcategoryModalState
  saving: boolean
  onClose: () => void
  onSave: (values: { name: string; scan_amount: number; is_active: boolean }) => void
}) {
  const [name, setName] = useState('')
  const [scanAmount, setScanAmount] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [nameError, setNameError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  useEffect(() => {
    if (state.mode === 'edit') {
      setName(state.subcategory.name)
      setScanAmount(String(state.subcategory.scan_amount ?? ''))
      setIsActive(state.subcategory.is_active)
    } else if (state.mode === 'create') {
      setName('')
      setScanAmount('')
      setIsActive(true)
    }
    setNameError(null)
    setAmountError(null)
  }, [state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!name.trim()) {
      setNameError('Sub-category name is required')
      hasError = true
    }

    const parsedAmount = Number(scanAmount)
    if (scanAmount.trim() === '' || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setAmountError('Enter a valid scan amount (0 or more)')
      hasError = true
    }

    if (hasError) return

    onSave({ name, scan_amount: parsedAmount, is_active: isActive })
  }

  return (
    <ModalShell
      open={state.mode !== 'closed'}
      title={state.mode === 'edit' ? 'Edit Sub-category' : 'Add Sub-category'}
      subtitle={
        state.mode === 'edit'
          ? 'Update this sub-category\u2019s details.'
          : 'Create a new sub-category under the selected category.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Sub-category Name" icon={<Tag size={16} />} error={nameError || undefined}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(null)
            }}
            placeholder="e.g. General Store"
            className={inputClass(!!nameError)}
            autoFocus
          />
        </Field>

        <Field label="Scan Amount (₹ per scan)" icon={<IndianRupee size={16} />} error={amountError || undefined}>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={scanAmount}
            onChange={(e) => {
              setScanAmount(e.target.value)
              if (amountError) setAmountError(null)
            }}
            placeholder="e.g. 4.00"
            className={inputClass(!!amountError)}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#1857D6] focus:ring-[#1857D6]/40"
          />
          <span>Active (visible to merchants during registration)</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : state.mode === 'edit' ? (
            'Save Changes'
          ) : (
            'Create Sub-category'
          )}
        </button>
      </form>
    </ModalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  target,
  saving,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ModalShell open={!!target} title="Delete this item?" onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            You&apos;re about to delete{' '}
            <strong className="font-semibold">{target?.name}</strong>
            {target?.type === 'category'
              ? '. All of its sub-categories will be deleted as well.'
              : '.'}{' '}
            This cannot be undone.
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </div>
    </ModalShell>
  )
}