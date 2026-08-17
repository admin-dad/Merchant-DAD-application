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
      amount,
      scan_ids,
      payment_mode,
    } = await req.json()

    // 1. Check required inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !merchant_id) {
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

    // 2. Cryptographic HMAC-SHA256 signature verification
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

    // 3. Log verified payment entry in merchant_payments
    const paymentPayload: Record<string, any> = {
      merchant_id,
      amount: Number(amount),
      payment_method: 'razorpay',
      utr_number: razorpay_payment_id,
      status: 'completed',
      remarks: `Razorpay Order: ${razorpay_order_id}`,
      razorpay_order_id,
      razorpay_payment_id,
    }

    const { data: paymentRecord, error: insertError } = await supabaseAdmin
      .from('merchant_payments')
      .insert(paymentPayload)
      .select()
      .single()

    if (insertError) {
      console.error('Database insertion error for merchant_payments:', insertError)
      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 4. Resolve which scans need to be marked as Paid
    // Skip entirely for points purchases — this route's scan-marking logic
    // only applies to scan-billing payments, never to buying reward points.
    let idsToUpdate: string[] = []

    if (payment_mode !== 'points_purchase') {
      idsToUpdate = Array.isArray(scan_ids) ? scan_ids : []

      // Fallback: only for actual billing payment modes, never as a default
      if (idsToUpdate.length === 0 && payment_mode === 'outstanding') {
        const { data: unpaidScans } = await supabaseAdmin
          .from('qr_scans')
          .select('id')
          .eq('merchant_id', merchant_id)
          .or('is_paid.is.null,is_paid.eq.false')
          .neq('payment_status', 'paid')

        if (unpaidScans && unpaidScans.length > 0) {
          idsToUpdate = unpaidScans.map((s) => s.id)
        }
      }
    }

    // 5. Update qr_scans table using admin client (bypasses RLS)
    if (idsToUpdate.length > 0) {
      const { error: scanUpdateError } = await supabaseAdmin
        .from('qr_scans')
        .update({
          fulfillment_status: 'Completed',
          is_paid: true,
          payment_status: 'paid',
        })
        .in('id', idsToUpdate)

      if (scanUpdateError) {
        console.error('Failed to update scans status:', scanUpdateError)
        return NextResponse.json(
          { error: `Payment recorded, but updating scans failed: ${scanUpdateError.message}` },
          { status: 500 }
        )
      }
    }
    return NextResponse.json({
      success: true,
      message: 'Payment verified and scan records updated successfully',
      payment: paymentRecord,
      updated_scans_count: idsToUpdate.length,
    })
  } catch (error: any) {
    console.error('Verify Payment API Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error during verification' },
      { status: 500 }
    )
  }
}