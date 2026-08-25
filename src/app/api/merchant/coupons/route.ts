import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────
// GET /api/merchant/coupons
//
// Read-only feed for merchants: returns every row in admin_coupons so
// merchants can see coupons across all partner companies, including
// hidden/expired ones (the UI labels status so it's clear what's live).
//
// Unlike /api/admin/coupons, this route does NOT use the Supabase service
// role key — it runs as the logged-in merchant under normal RLS, and only
// ever selects. There is no POST/PATCH/DELETE here on purpose.
//
// Requires an `admin_coupons` SELECT policy that allows authenticated
// users to read (e.g. `USING (auth.role() = 'authenticated')`), since this
// route intentionally does not bypass RLS.
// ─────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    // TODO: once merchants have a role/company mapping, verify the caller
    // is a legitimate merchant here (and optionally scope results to their
    // own company) before shipping this to production.

    const { data, error } = await supabase
      .from('admin_coupons')
      .select(
        'id, title, description, company_name, image_url, code, discount_type, discount_value, is_active, starts_at, expires_at, usage_limit, usage_count, sort_order, created_at'
      )
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Merchant coupons select error:', error)
      return NextResponse.json({ error: 'Failed to load coupons.' }, { status: 500 })
    }

    return NextResponse.json({ coupons: data || [] })
  } catch (err: unknown) {
    console.error('Merchant coupons route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}