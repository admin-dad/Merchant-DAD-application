import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(request:Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error:'Enter a valid email address.' }, { status:400 })
    const client = createAdminClient()
    // The Auth directory is only accessible on the server. Never return user records.
    for (let page=1; ; page++) {
      const { data,error } = await client.auth.admin.listUsers({ page, perPage:1000 })
      if (error) throw error
      if (data.users.some(user => user.email?.toLowerCase() === email)) return NextResponse.json({ registered:true }, { headers:{'Cache-Control':'no-store'} })
      if (data.users.length < 1000) return NextResponse.json({ registered:false }, { headers:{'Cache-Control':'no-store'} })
    }
  } catch { return NextResponse.json({ error:'Could not verify your email. Please try again.' }, { status:503 }) }
}
