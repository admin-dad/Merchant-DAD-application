import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const { data, error } = await createAdminClient().from('settings').select('key,value').in('key', ['support_email', 'support_phone'])
    if (error) throw error
    const contact = { support_email: '', support_phone: '' }
    for (const row of data ?? []) {
      if ((row.key === 'support_email' || row.key === 'support_phone') && typeof row.value === 'string') contact[row.key as keyof typeof contact] = row.value.trim()
    }
    return NextResponse.json(contact, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Contact details are temporarily unavailable.' }, { status: 500 }) }
}
