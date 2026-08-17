'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('admin/login')
        return
      }

      // Verify Admin Status from the 'admin' table
      const { data: adminData } = await supabase
        .from('admin')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!adminData) {
        await supabase.auth.signOut()
        router.push('admin/login')
        return
      }

      setLoading(false)
    }

    checkAdmin()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1857D6]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Render the Sidebar Component */}
      <AdminSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}