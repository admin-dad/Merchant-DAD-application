import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// /api/admin/coupons
//
// GET    → list all coupons
// POST   → create a coupon
// PATCH  → toggle a coupon's is_active flag (?id=<couponId>)
// DELETE → delete a coupon (?id=<couponId>)
//
// Auth: only checks the caller is logged in — add an admin-role check
// before production, same TODO as /api/admin/subscriptions.
// ─────────────────────────────────────────────────────────────────────────

interface CouponRecord {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_points: number
  max_redemptions: number | null
  redemption_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

async function requireAuthedAdminClient() {
  const serverClient = await createServerClient()
  const {
    data: { user },
    error: userErr,
  } = await serverClient.auth.getUser()

  if (userErr || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  // TODO: check user is an admin before continuing.

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return { supabaseAdmin }
}

export async function GET() {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select(
        `
        id, code, description, discount_type, discount_value,
        min_order_points, max_redemptions,
        redemption_count, valid_from, valid_until, is_active, created_at
      `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data as unknown as CouponRecord[]) || []
    const coupons = rows.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_points: c.min_order_points,
      max_redemptions: c.max_redemptions,
      redemption_count: c.redemption_count,
      valid_from: c.valid_from,
      valid_until: c.valid_until,
      is_active: c.is_active,
      created_at: c.created_at,
    }))

    return NextResponse.json({ coupons })
  } catch (err: unknown) {
    console.error('Admin coupons fetch error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load coupons.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface CreateCouponBody {
  code?: string
  description?: string | null
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number
  min_order_points?: number
  max_redemptions?: number | null
  valid_from?: string | null
  valid_until?: string | null
  is_active?: boolean
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const body = (await request.json()) as CreateCouponBody

    const code = body.code?.trim().toUpperCase()
    const discountType = body.discount_type ?? 'percentage'
    const discountValue = Number(body.discount_value ?? 0)

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 })
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json({ error: 'Invalid discount type.' }, { status: 400 })
    }
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0.' }, { status: 400 })
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code,
        description: body.description?.trim() || null,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_points: Number(body.min_order_points ?? 0),
        max_redemptions: body.max_redemptions ?? null,
        valid_from: body.valid_from || new Date().toISOString(),
        valid_until: body.valid_until || null,
        is_active: body.is_active ?? true,
      })
      .select('id, code, discount_type, discount_value')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Coupon code "${code}" already exists.` }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ coupon: data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Admin create coupon error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create coupon.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Toggle is_active on/off — used by the Active/Hidden switch in the table.
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing coupon id.' }, { status: 400 })
    }

    const body = (await request.json()) as { is_active?: boolean }
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin toggle coupon error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update coupon.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing coupon id.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin delete coupon error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete coupon.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}