// app/vendor/layout.tsx
import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VendorSidebar from '@/components/vendoresidebar' // Updated filename match

export default async function VendorLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, store_name, owner_name, category, business_type')
    .eq('user_id', user.id)
    .single()

  const storeName = vendor?.store_name || 'Vendor Store'

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
      <VendorSidebar vendorName={storeName} vendorId={vendor?.id} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}