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

// GST-INCLUSIVE PRICING: plan.price in the database IS the final amount the
// merchant pays (e.g. ₹132 means they pay exactly ₹132, nothing added on
// top). We back-calculate the base price and GST component purely for
// record-keeping / invoicing — Razorpay is always charged plan.price as-is.
// Formula: base = inclusive_total / (1 + GST_RATE), gst = total - base.
const GST_RATE = 0.18

// Branding shown in the Razorpay checkout modal — matches create-order/route.ts.
const APP_BRAND_NAME = 'DAD'

export async function POST(req: NextRequest) {
  try {
    const { merchant_id, plan_id } = await req.json()

    if (!merchant_id || !plan_id) {
      return NextResponse.json(
        { error: 'merchant_id and plan_id are required' },
        { status: 400 }
      )
    }

    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name')
      .eq('id', merchant_id)
      .maybeSingle()

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // Price is always looked up server-side — never trust an amount sent by
    // the client, same principle as the scan/monthly billing order route.
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, slug, price, billing_interval, is_active')
      .eq('id', plan_id)
      .eq('is_active', true)
      .maybeSingle()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (Number(plan.price) <= 0) {
      return NextResponse.json(
        { error: 'This plan does not require payment' },
        { status: 400 }
      )
    }

    // plan.price is GST-inclusive — it's exactly what gets charged.
    const totalAmount = Number(plan.price)
    const baseAmount = Math.round((totalAmount / (1 + GST_RATE)) * 100) / 100
    const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100

    // Razorpay accepts amounts in lowest currency unit (Paise for INR)
    const amountInPaise = Math.round(totalAmount * 100)

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sub_${merchant_id.slice(0, 8)}_${Date.now()}`,
      notes: {
        merchant_id,
        merchant_business_name: merchant.business_name || '',
        plan_id: plan.id,
        plan_slug: plan.slug,
        billing_interval: plan.billing_interval,
        base_amount: baseAmount.toFixed(2),
        gst_rate: String(GST_RATE),
        gst_amount: gstAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
      },
    }

    const order = await razorpay.orders.create(orderOptions)

    return NextResponse.json({
      order_id: order.id,
      currency: order.currency,
      amount: order.amount,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      brand_name: APP_BRAND_NAME,
      base_amount: baseAmount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      plan_id: plan.id,
      plan_name: plan.name,
      billing_interval: plan.billing_interval,
      description: `${plan.name} plan subscription`,
    })
  } catch (error: any) {
    console.error('Error creating subscription order:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize subscription payment order' },
      { status: 500 }
    )
  }
}