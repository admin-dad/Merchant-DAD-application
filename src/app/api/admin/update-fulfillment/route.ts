import { NextResponse } from 'next/server'
import { createAdminClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const serverClient = await createServerClient()
    const { data: { user }, error: userErr } = await serverClient.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { scanId, newStatus, table } = await request.json()

    if (!scanId || !newStatus || !table) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
      .from(table)
      .update({ fulfillment_status: newStatus })
      .eq('id', scanId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Update fulfillment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
