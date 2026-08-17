import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { merchant_id, scan_ids, custom_amount, payment_mode } = await req.json()

    if (!merchant_id) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 })
    }

    // Get scan billing rate from config or merchant profile
    const { data: configData } = await supabaseAdmin
      .from('points_config')
      .select('scan_bonus_rs')
      .eq('id', 1)
      .maybeSingle()

    const { data: merchantData } = await supabaseAdmin
      .from('merchants')
      .select('billing_rate')
      .eq('id', merchant_id)
      .maybeSingle()

    const rate = Number(configData?.scan_bonus_rs) || Number(merchantData?.billing_rate) || 4.0

    let calculatedAmount = 0

    if (payment_mode === 'selected' && Array.isArray(scan_ids)) {
      calculatedAmount = scan_ids.length * rate
    } else if (payment_mode === 'custom' && custom_amount) {
      calculatedAmount = parseFloat(custom_amount)
    } else if (payment_mode === 'outstanding') {
      // Calculate unpaid scans total
      const { data: unpaidScans } = await supabaseAdmin
        .from('qr_scans')
        .select('id')
        .eq('merchant_id', merchant_id)
        .or('is_paid.is.null,is_paid.eq.false')
        .neq('payment_status', 'paid')

      const unpaidCount = unpaidScans?.length || 0
      calculatedAmount = unpaidCount * rate
    }

    if (calculatedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid or zero payment amount' }, { status: 400 })
    }

    // Razorpay accepts amounts in lowest currency unit (Paise for INR: 1 INR = 100 Paise)
    const amountInPaise = Math.round(calculatedAmount * 100)

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${merchant_id.slice(0, 8)}_${Date.now()}`,
      notes: {
        merchant_id,
        scan_ids_count: scan_ids?.length || 0,
        payment_mode,
      },
    }

    const order = await razorpay.orders.create(orderOptions)

    return NextResponse.json({
      order_id: order.id,
      currency: order.currency,
      amount: order.amount,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment order' },
      { status: 500 }
    )
  }
}