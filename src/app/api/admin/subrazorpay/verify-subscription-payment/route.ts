import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      merchant_id,
      plan_id,
      amount,
      base_amount,
      gst_amount,
    } = await req.json()

    // 1. Check required inputs
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !merchant_id ||
      !plan_id
    ) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters' },
        { status: 400 }
      )
    }

    const secret = process.env.RAZORPAY_KEY_SECRET

    if (!secret) {
      return NextResponse.json(
        { error: 'RAZORPAY_KEY_SECRET is missing in server environment variables' },
        { status: 500 }
      )
    }

    // 2. Cryptographic HMAC-SHA256 signature verification — same approach as
    // app/api/subrazorpay/verify-payment/route.ts
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(razorpay_signature, 'utf-8')
    )

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      )
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, billing_interval')
      .eq('id', plan_id)
      .maybeSingle()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // 3. Log the verified payment into the same merchant_payments ledger
    // used for scan/monthly billing, tagged payment_mode: 'subscription'.
    const paymentPayload: Record<string, any> = {
      merchant_id,
      plan_id,
      amount: Number(amount),
      payment_method: 'razorpay',
      utr_number: razorpay_payment_id,
      status: 'completed',
      remarks: `Razorpay Order: ${razorpay_order_id} | Subscription: ${plan.name}`,
      razorpay_order_id,
      razorpay_payment_id,
      payment_mode: 'subscription',
    }

    if (base_amount !== undefined && base_amount !== null) {
      paymentPayload.base_amount = Number(base_amount)
    }
    if (gst_amount !== undefined && gst_amount !== null) {
      paymentPayload.gst_amount = Number(gst_amount)
    }

    const { data: paymentRecord, error: insertError } = await supabaseAdmin
      .from('merchant_payments')
      .insert(paymentPayload)
      .select()
      .single()

    if (insertError) {
      console.error('Database insertion error for merchant_payments (subscription):', insertError)
      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 4. Activate the plan on the merchant record. This is the step that
    // actually upgrades them — everything above is just proving and
    // logging the payment.
    const expiresAt = new Date()
    if (plan.billing_interval === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else if (plan.billing_interval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    }

    const { error: updateError } = await supabaseAdmin
      .from('merchants')
      .update({
        subscription_plan_id: plan.id,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', merchant_id)

    if (updateError) {
      console.error('Failed to activate subscription on merchant:', updateError)
      return NextResponse.json(
        { error: `Payment recorded, but activating your plan failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      payment: paymentRecord,
      plan_name: plan.name,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Verify Subscription Payment API Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error during verification' },
      { status: 500 }
    )
  }
}