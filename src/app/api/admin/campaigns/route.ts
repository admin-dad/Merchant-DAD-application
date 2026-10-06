import { NextResponse } from 'next/server'
import { createAdminClient as createServerClient } from '@/lib/supabase/server'
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

    // Soft delete the campaign so that historical scans can still join on it to read the gift names.
    const { error: deleteErr } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'deleted' })
      .eq('id', id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin delete campaign error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete campaign.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
