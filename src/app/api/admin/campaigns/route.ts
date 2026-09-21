import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAuthedAdminClient() {
  const serverClient = await createServerClient()
  const {
    data: { user },
    error: userErr,
  } = await serverClient.auth.getUser()

  if (userErr || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const supabaseAdmin = createAdminClient()

  return { supabaseAdmin }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id.' }, { status: 400 })
    }

    // Delete associated QR scans and merchant scratch cards to satisfy foreign key constraints
    await supabaseAdmin.from('qr_scans').delete().eq('campaign_id', id)
    await supabaseAdmin.from('merchant_scratch_cards').delete().eq('campaign_id', id)

    // Delete the campaign
    const { error: deleteErr } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin delete campaign error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete campaign.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
