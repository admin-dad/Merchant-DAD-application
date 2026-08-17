import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Merchantsidebar from '@/components/Merchantsidebar'

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, status')
    .eq('user_id', user.id)
    .single()

  // Merchant registered but row not created yet (rare race with the trigger) —
  // or found but not yet approved. Either way still let them into the shell;
  // individual pages can gate on `status` if they need to.
  return (
    <div className="flex min-h-screen">
      <Merchantsidebar
        businessName={merchant?.business_name || user.email || 'Your Business'}
        merchantId={merchant?.id}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}