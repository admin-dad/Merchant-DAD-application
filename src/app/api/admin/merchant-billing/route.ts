import { NextResponse } from 'next/server'
import { createAdminClient as createAdminSessionClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Save this file as: app/api/admin/merchant-billing/route.ts

export async function GET() {
  const supabase = await createAdminSessionClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: adminUser, error: roleError } = await supabase.from('admin').select('id').eq('id', user.id).maybeSingle()
  if (roleError || !adminUser) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // 2. Use the service-role client to read across ALL merchants, bypassing RLS.
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Admin client misconfigured' },
      { status: 500 }
    )
  }

  const { data: merchants, error: merchantErr } = await admin
    .from('merchants')
    .select('id, business_name, category, sub_category, billing_type')
    .order('business_name', { ascending: true })

  if (merchantErr) {
    return NextResponse.json({ error: merchantErr.message }, { status: 500 })
  }

  const { data: payments, error: paymentErr } = await admin
    .from('merchant_payments')
    .select('id, merchant_id, amount, status, created_at, merchants(business_name)')
    .order('created_at', { ascending: false })

  if (paymentErr) {
    return NextResponse.json({ error: paymentErr.message }, { status: 500 })
  }

  // Points purchases live in merchant_transactions (the wallet ledger), not
  // merchant_payments — the Buy Points flow inserts a 'credit' row here once
  // the Razorpay payment is verified, so every row matching this filter
  // already represents a completed, paid purchase.
  const { data: pointsPurchases, error: pointsErr } = await admin
    .from('merchant_transactions')
    .select('id, merchant_id, amount, description, created_at, merchants(business_name)')
    .eq('wallet_type', 'points')
    .eq('transaction_type', 'credit')
    .eq('category', 'purchase')
    .order('created_at', { ascending: false })

  if (pointsErr) {
    return NextResponse.json({ error: pointsErr.message }, { status: 500 })
  }

  // Points purchases only store the points amount, not the ₹ charged — pull
  // the current rate so the UI can show an approximate ₹ value alongside it.
  const { data: pointsConfig } = await admin
    .from('points_config')
    .select('value_per_point')
    .eq('id', 1)
    .maybeSingle()

  return NextResponse.json({
    merchants,
    payments,
    pointsPurchases,
    valuePerPoint: pointsConfig?.value_per_point ?? 1,
  })
}