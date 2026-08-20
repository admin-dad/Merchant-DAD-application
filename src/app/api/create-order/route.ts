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

// GST applied on top of whatever is due. Keep in sync with the frontend's GST_RATE.
const GST_RATE = 0.18

// Branding shown in the Razorpay checkout modal — the app, not the merchant's own business name.
const APP_BRAND_NAME = 'DAD'

/**
 * Resolves the per-scan billing rate for a merchant using the SAME priority
 * order as the payments page: sub-category scan_amount -> merchant's own
 * billing_rate -> a 4.0 fallback. Deliberately does NOT consult
 * points_config.scan_bonus_rs — that was a global fallback that was
 * silently overriding merchant-specific rates and caused undercharging.
 */
async function resolveScanRate(merchant: {
  category: string | null
  sub_category: string | null
  billing_rate: number | null
}): Promise<number> {
  if (merchant.category && merchant.sub_category) {
    const { data: catRow } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', merchant.category)
      .maybeSingle()

    if (catRow) {
      const { data: subRow } = await supabaseAdmin
        .from('subcategories')
        .select('scan_amount')
        .eq('category_id', catRow.id)
        .eq('name', merchant.sub_category)
        .maybeSingle()

      if (subRow && subRow.scan_amount !== null && Number(subRow.scan_amount) > 0) {
        return Number(subRow.scan_amount)
      }
    }
  }

  if (merchant.billing_rate && Number(merchant.billing_rate) > 0) {
    return Number(merchant.billing_rate)
  }

  return 4.0
}

export async function POST(req: NextRequest) {
  try {
    const { merchant_id, payment_mode, billing_month } = await req.json()

    if (!merchant_id) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 })
    }

    const { data: merchantData, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, category, sub_category, billing_rate, billing_type')
      .eq('id', merchant_id)
      .maybeSingle()

    if (merchantError || !merchantData) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    let baseAmount = 0
    let scanIdsToCharge: string[] = []
    let description = ''

    if (payment_mode === 'monthly') {
      // Flat monthly subscription fee — merchants.billing_rate is treated as the fee.
      baseAmount = merchantData.billing_rate && Number(merchantData.billing_rate) > 0
        ? Number(merchantData.billing_rate)
        : 0

      if (baseAmount <= 0) {
        return NextResponse.json({ error: 'No monthly fee configured for this merchant' }, { status: 400 })
      }

      description = `Monthly QR subscription${billing_month ? ` (${billing_month})` : ''}`
    } else {
      // Per-scan billing — always "pay all outstanding scans together", server-computed.
      const rate = await resolveScanRate(merchantData)

      const { data: unpaidScans, error: unpaidError } = await supabaseAdmin
        .from('qr_scans')
        .select('id')
        .eq('merchant_id', merchant_id)
        .or('is_paid.is.null,is_paid.eq.false')
        .neq('payment_status', 'paid')

      if (unpaidError) {
        return NextResponse.json({ error: `Failed to load outstanding scans: ${unpaidError.message}` }, { status: 500 })
      }

      scanIdsToCharge = (unpaidScans || []).map((s) => s.id)
      baseAmount = scanIdsToCharge.length * rate

      if (baseAmount <= 0 || scanIdsToCharge.length === 0) {
        return NextResponse.json({ error: 'There are no outstanding scans to pay for' }, { status: 400 })
      }

      description = `QR scan charges \u00d7 ${scanIdsToCharge.length} scans @ \u20b9${rate}/scan`
    }

    const gstAmount = Math.round(baseAmount * GST_RATE * 100) / 100
    const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100

    // Razorpay accepts amounts in lowest currency unit (Paise for INR: 1 INR = 100 Paise)
    const amountInPaise = Math.round(totalAmount * 100)

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${merchant_id.slice(0, 8)}_${Date.now()}`,
      notes: {
        merchant_id,
        merchant_business_name: merchantData.business_name || '',
        payment_mode: payment_mode || 'outstanding',
        billing_month: billing_month || '',
        scan_ids_count: scanIdsToCharge.length,
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
      scan_ids: scanIdsToCharge,
      description,
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment order' },
      { status: 500 }
    )
  }
}