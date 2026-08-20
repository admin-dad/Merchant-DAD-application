import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// GET /api/admin/subscriptions
//
// Returns every subscription plan (with a live merchant count) and every
// merchant's current plan assignment, flattened for the admin UI.
//
// Auth: this only checks that the caller is a logged-in user. Add your own
// admin-role check below (mirroring whatever /api/admin/merchant-billing
// does) before this ships to production.
//
// Why the service role: RLS only lets a merchant see their OWN row, so this
// route uses the service role key server-side to read across all merchants
// — same pattern as /api/admin/merchant-billing.
//
// NOTE: plan assignment is read directly from merchants.subscription_plan_id
// / merchants.subscription_expires_at — that's what
// /api/subrazorpay/verify-subscription-payment actually writes to when a
// merchant upgrades. The merchant_subscriptions table is not populated by
// that flow, so we don't read from it here.
// ─────────────────────────────────────────────────────────────────────────

interface PlanRecord {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billing_interval: 'free' | 'monthly' | 'yearly'
  features: string[] | null
  is_active: boolean
  sort_order: number
}

interface PlanJoin {
  name: string
  billing_interval: 'free' | 'monthly' | 'yearly'
}

interface MerchantWithPlan {
  id: string
  business_name: string
  subscription_plan_id: string | null
  subscription_expires_at: string | null
  created_at: string
  subscription_plans?: PlanJoin | PlanJoin[] | null
}

type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due'

function normalizePlanJoin(joined: PlanJoin | PlanJoin[] | null | undefined): PlanJoin | null {
  if (!joined) return null
  return Array.isArray(joined) ? joined[0] ?? null : joined
}

// Derives a status since there's no separate status column tracking this:
// free plans (or plans with no expiry set) are always 'active'; paid plans
// past their expiry are 'expired'.
function deriveStatus(
  merchant: MerchantWithPlan,
  billingInterval: string | undefined
): SubscriptionStatus {
  if (billingInterval === 'free') return 'active'
  if (!merchant.subscription_expires_at) return 'active'
  return new Date(merchant.subscription_expires_at).getTime() > Date.now() ? 'active' : 'expired'
}

// Shared helper: confirm the caller is logged in, return an admin
// (service-role) client to use for the rest of the request.
async function requireAuthedAdminClient() {
  const serverClient = await createServerClient()
  const {
    data: { user },
    error: userErr,
  } = await serverClient.auth.getUser()

  if (userErr || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  // TODO: check user is an admin (e.g. look up an `admins` table or a
  // role claim) before continuing — this route currently trusts anyone
  // who is logged in.

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

    const [plansRes, merchantsRes] = await Promise.all([
      supabaseAdmin
        .from('subscription_plans')
        .select('id, name, slug, description, price, billing_interval, features, is_active, sort_order')
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('merchants')
        .select(
          `
          id,
          business_name,
          subscription_plan_id,
          subscription_expires_at,
          created_at,
          subscription_plans ( name, billing_interval )
        `
        )
        .order('created_at', { ascending: false }),
    ])

    if (plansRes.error) throw plansRes.error
    if (merchantsRes.error) throw merchantsRes.error

    const planRows = (plansRes.data as PlanRecord[]) || []
    const merchantRows = (merchantsRes.data as unknown as MerchantWithPlan[]) || []

    const activeCountByPlan = new Map<string, number>()

    const subscriptions = merchantRows
      .filter((m) => !!m.subscription_plan_id)
      .map((m) => {
        const planJoin = normalizePlanJoin(m.subscription_plans)
        const status = deriveStatus(m, planJoin?.billing_interval)

        if (status === 'active' && m.subscription_plan_id) {
          activeCountByPlan.set(
            m.subscription_plan_id,
            (activeCountByPlan.get(m.subscription_plan_id) || 0) + 1
          )
        }

        return {
          id: m.id,
          merchant_id: m.id,
          merchant_name: m.business_name || 'Unknown',
          plan_id: m.subscription_plan_id as string,
          plan_name: planJoin?.name || 'Unknown',
          status,
          started_at: m.created_at,
          current_period_end: m.subscription_expires_at,
        }
      })

    const plans = planRows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      billing_interval: p.billing_interval,
      features: p.features || [],
      is_active: p.is_active,
      sort_order: p.sort_order,
      merchantCount: activeCountByPlan.get(p.id) || 0,
    }))

    return NextResponse.json({ plans, subscriptions })
  } catch (err: unknown) {
    console.error('Admin subscriptions fetch error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load subscription data.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/admin/subscriptions
//
// Creates a new subscription plan. Called by the "Add Plan" modal.
// Body: { name, slug, description?, price, billing_interval, features?,
//          is_active?, sort_order? }
// ─────────────────────────────────────────────────────────────────────────
interface CreatePlanBody {
  name?: string
  slug?: string
  description?: string | null
  price?: number
  billing_interval?: 'free' | 'monthly' | 'yearly'
  features?: string[]
  is_active?: boolean
  sort_order?: number
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const body = (await request.json()) as CreatePlanBody

    const name = body.name?.trim()
    const slug = body.slug?.trim()
    const billingInterval = body.billing_interval ?? 'monthly'
    const price = billingInterval === 'free' ? 0 : Number(body.price ?? 0)

    if (!name) {
      return NextResponse.json({ error: 'Plan name is required.' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
    }
    if (!['free', 'monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json({ error: 'Invalid billing interval.' }, { status: 400 })
    }
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be 0 or more.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert({
        name,
        slug,
        description: body.description?.trim() || null,
        price,
        billing_interval: billingInterval,
        features: Array.isArray(body.features) ? body.features : [],
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select('id, name, slug, description, price, billing_interval, features, is_active, sort_order')
      .single()

    if (error) {
      // Unique violation on slug
      if (error.code === '23505') {
        return NextResponse.json({ error: `A plan with slug "${slug}" already exists.` }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ plan: { ...data, merchantCount: 0 } }, { status: 201 })
  } catch (err: unknown) {
    console.error('Admin create plan error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create plan.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/subscriptions?id=<planId>
//
// Deletes a subscription plan. Blocked (409) if any merchant still has this
// plan set as their subscription_plan_id, so we never orphan a merchant's
// plan reference.
// ─────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthedAdminClient()
    if (auth.error) return auth.error
    const { supabaseAdmin } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing plan id.' }, { status: 400 })
    }

    // Guard: don't delete a plan that merchants are still assigned to
    // (deleting it would leave their subscription_plan_id pointing at
    // nothing).
    const { count, error: countErr } = await supabaseAdmin
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_plan_id', id)

    if (countErr) throw countErr

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `${count} merchant${count === 1 ? ' is' : 's are'} still on this plan. Move them to a different plan before deleting it.`,
        },
        { status: 409 }
      )
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin delete plan error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete plan.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}