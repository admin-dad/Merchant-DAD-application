import { NextResponse } from 'next/server'
import { createAdminClient as createSessionClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: authorized, error } = await session.from('admin').select('id').eq('id', user.id).maybeSingle()
  if (error || !authorized) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  try {
    const client = createAdminClient()
    const read = async (table: 'orders' | 'merchants' | 'products', columns: string) => {
      const rows: Record<string, unknown>[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from(table).select(columns).order('id').range(offset, offset + 499)
        if (error) throw error
        rows.push(...(data ?? []) as unknown as Record<string, unknown>[])
        if (!data || data.length < 500) return rows
      }
    }
    const [orders, merchants, products] = await Promise.all([
      read('orders', '*, order_items(*)'), read('merchants', 'id, business_name'), read('products', 'id, name'),
    ])
    orders.sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)))
    return NextResponse.json({ orders, merchants, products }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load orders.' }, { status: 500 })
  }
}
