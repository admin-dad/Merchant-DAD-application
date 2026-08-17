import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Fetch all merchants
    const { data: merchants, error: merchErr } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, billing_rate, created_at')
      .order('business_name', { ascending: true })

    if (merchErr) throw merchErr

    // Fetch all merchant payments (bypassing RLS)
    const { data: payments, error: payErr } = await supabaseAdmin
      .from('merchant_payments')
      .select('id, merchant_id, amount, status, created_at')

    if (payErr) throw payErr

    // Fetch all QR scans for billing metrics
    const { data: scans, error: scanErr } = await supabaseAdmin
      .from('qr_scans')
      .select('id, merchant_id, is_paid, payment_status')

    if (scanErr) throw scanErr

    return NextResponse.json({
      merchants: merchants || [],
      payments: payments || [],
      scans: scans || [],
    })
  } catch (error: any) {
    console.error('Admin Payments API Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}