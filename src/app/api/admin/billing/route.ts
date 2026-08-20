import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// TODO: this route currently has no auth check of its own — it relies on the
// admin-billing page being behind your admin auth/middleware. Since it uses
// the service-role client (bypasses RLS) and returns every merchant's
// financial data, add a real admin/session check here before shipping this
// to production (e.g. verify a Supabase session + an `is_admin` flag, or an
// internal API secret header).

export async function GET() {
  try {
    const { data: merchants, error: merchantsError } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, category, sub_category, billing_type, billing_rate, status')
      .order('business_name', { ascending: true })

    if (merchantsError) {
      return NextResponse.json({ error: `Failed to load merchants: ${merchantsError.message}` }, { status: 500 })
    }

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('merchant_payments')
      .select(
        'id, merchant_id, amount, base_amount, gst_amount, status, payment_method, utr_number, payment_mode, billing_month, remarks, created_at'
      )
      .order('created_at', { ascending: false })

    if (transactionsError) {
      return NextResponse.json({ error: `Failed to load transactions: ${transactionsError.message}` }, { status: 500 })
    }

    const { data: scans, error: scansError } = await supabaseAdmin
      .from('qr_scans')
      .select('id, merchant_id, is_paid, payment_status, created_at')

    if (scansError) {
      return NextResponse.json({ error: `Failed to load scans: ${scansError.message}` }, { status: 500 })
    }

    // ── Resolve the same per-scan rate the merchant portal uses ──────────
    // Priority: merchant's sub-category `scan_amount` override → merchant's
    // own `billing_rate` → fallback ₹4.00. This mirrors the exact logic in
    // MerchantScanPaymentPage so admin and merchant numbers always agree.
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name')

    if (categoriesError) {
      return NextResponse.json({ error: `Failed to load categories: ${categoriesError.message}` }, { status: 500 })
    }

    const { data: subcategories, error: subcategoriesError } = await supabaseAdmin
      .from('subcategories')
      .select('category_id, name, scan_amount')

    if (subcategoriesError) {
      return NextResponse.json({ error: `Failed to load subcategories: ${subcategoriesError.message}` }, { status: 500 })
    }

    const categoryIdByName = new Map((categories || []).map((c) => [c.name, c.id]))
    const scanAmountByKey = new Map(
      (subcategories || [])
        .filter((s) => s.scan_amount !== null && s.scan_amount !== undefined)
        .map((s) => [`${s.category_id}::${s.name}`, Number(s.scan_amount)])
    )

    const DEFAULT_SCAN_RATE = 4.0

    const merchantsWithRate = (merchants || []).map((m) => {
      // Monthly merchants don't have a "scan rate" — billing_rate there is
      // the flat monthly fee, so we don't touch it.
      if (m.billing_type === 'monthly') {
        return { ...m, resolved_scan_amount: null, rate_source: 'monthly_flat_fee' as const }
      }

      const categoryId = m.category ? categoryIdByName.get(m.category) : undefined
      const subcategoryScanAmount =
        categoryId && m.sub_category ? scanAmountByKey.get(`${categoryId}::${m.sub_category}`) : undefined

      let resolved_scan_amount: number
      let rate_source: 'sub_category' | 'billing_rate' | 'default'

      if (subcategoryScanAmount !== undefined && subcategoryScanAmount > 0) {
        resolved_scan_amount = subcategoryScanAmount
        rate_source = 'sub_category'
      } else if (m.billing_rate && Number(m.billing_rate) > 0) {
        resolved_scan_amount = Number(m.billing_rate)
        rate_source = 'billing_rate'
      } else {
        resolved_scan_amount = DEFAULT_SCAN_RATE
        rate_source = 'default'
      }

      return { ...m, resolved_scan_amount, rate_source }
    })

    return NextResponse.json({
      merchants: merchantsWithRate,
      transactions: transactions || [],
      scans: scans || [],
    })
  } catch (error: any) {
    console.error('Admin billing API error:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}