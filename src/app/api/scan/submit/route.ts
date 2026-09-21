import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, customer_name, customer_phone, campaign_id, status } = body

    if (!merchant_id || !customer_name || !customer_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('qr_scans')
      .insert([
        {
          merchant_id,
          customer_name,
          customer_phone,
          status: status || 'Pending',
          campaign_id: campaign_id || null,
        },
      ])
      .select('id')
      .single()

    if (error) {
      console.error('API /scan/submit insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err: any) {
    console.error('API /scan/submit exception:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
