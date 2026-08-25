import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// Service-role client. This route is the ONLY place allowed to write to
// admin_coupons — RLS on the table has no insert/update/delete policies
// for anon/auth, so this key is required. NEVER expose this key to the
// browser (it must only ever live in server-side env vars).
//
// NOTE: same as /api/admin/subscriptions — this route only needs the
// caller to be logged in on the client page. Add a real admin-role check
// here (e.g. checking a `role` claim or an `admins` table) before shipping
// this to production.
// ─────────────────────────────────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role env vars.')
  }

  return createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const BUCKET = 'coupon-images'

// ── helper: upload a base64 image, returns the public URL ──────────────
async function uploadImage(
  supabase: ReturnType<typeof getServiceClient>,
  image_base64: string,
  image_filename?: string | null
) {
  const match = image_base64.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw Object.assign(new Error('Invalid image data.'), { status: 400 })
  }
  const contentType = match[1]
  const buffer = Buffer.from(match[2], 'base64')

  // 5MB cap
  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw Object.assign(new Error('Image must be 5MB or smaller.'), { status: 400 })
  }

  const ext = (image_filename?.split('.').pop() || contentType.split('/').pop() || 'png').toLowerCase()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrlData.publicUrl
}

// ── helper: best-effort remove a stored image from its public URL ──────
async function removeStoredImage(supabase: ReturnType<typeof getServiceClient>, imageUrl: string | null | undefined) {
  if (!imageUrl) return
  const path = imageUrl.split(`${BUCKET}/`).pop()
  if (path) {
    await supabase.storage.from(BUCKET).remove([path])
  }
}

// ── GET: list all coupons ───────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('admin_coupons')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ coupons: data ?? [] })
  } catch (err: unknown) {
    console.error('GET /api/admin/coupons error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load coupons.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST: create a coupon (optionally uploading a base64 image) ────────
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const body = await req.json()

    const {
      title,
      description,
      company_name,
      code,
      discount_type,
      discount_value,
      is_active,
      starts_at,
      expires_at,
      usage_limit,
      sort_order,
      image_base64, // e.g. "data:image/png;base64,AAAA..."
      image_filename, // e.g. "logo.png"
    } = body ?? {}

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (!company_name || typeof company_name !== 'string') {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
    }
    if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Invalid discount type.' }, { status: 400 })
    }

    // ── Upload image, if provided ──────────────────────────────────────
    let image_url: string | null = null

    if (typeof image_base64 === 'string' && image_base64.length > 0) {
      image_url = await uploadImage(supabase, image_base64, image_filename)
    }

    // ── Insert row ────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('admin_coupons')
      .insert({
        title,
        description: description || null,
        company_name,
        image_url,
        code: code || null,
        discount_type: discount_type || 'percentage',
        discount_value: Number(discount_value) || 0,
        is_active: is_active ?? true,
        starts_at: starts_at || null,
        expires_at: expires_at || null,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ coupon: data }, { status: 201 })
  } catch (err: unknown) {
    console.error('POST /api/admin/coupons error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create coupon.'
    const status = (err as { status?: number })?.status ?? 500
    return NextResponse.json({ error: message }, { status })
  }
}

// ── PATCH: update an existing coupon (optionally replacing its image) ──
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const body = await req.json()

    const {
      id,
      title,
      description,
      company_name,
      code,
      discount_type,
      discount_value,
      is_active,
      starts_at,
      expires_at,
      usage_limit,
      sort_order,
      image_base64, // new image to upload, if the user picked a new one
      image_filename,
      remove_image, // true if the user explicitly cleared the image
    } = body ?? {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing coupon id.' }, { status: 400 })
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (!company_name || typeof company_name !== 'string') {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
    }
    if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Invalid discount type.' }, { status: 400 })
    }

    // Look up the existing row so we know the current image and can clean
    // up the old file from storage if it's being replaced or removed.
    const { data: existing, error: fetchError } = await supabase
      .from('admin_coupons')
      .select('image_url')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 })
    }

    let image_url: string | null = existing.image_url

    if (typeof image_base64 === 'string' && image_base64.length > 0) {
      // A new image was picked — upload it, then remove the old one.
      const newUrl = await uploadImage(supabase, image_base64, image_filename)
      await removeStoredImage(supabase, existing.image_url)
      image_url = newUrl
    } else if (remove_image === true) {
      // User explicitly cleared the image without picking a new one.
      await removeStoredImage(supabase, existing.image_url)
      image_url = null
    }

    const { data, error } = await supabase
      .from('admin_coupons')
      .update({
        title,
        description: description || null,
        company_name,
        image_url,
        code: code || null,
        discount_type: discount_type || 'percentage',
        discount_value: Number(discount_value) || 0,
        is_active: is_active ?? true,
        starts_at: starts_at || null,
        expires_at: expires_at || null,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ coupon: data })
  } catch (err: unknown) {
    console.error('PATCH /api/admin/coupons error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update coupon.'
    const status = (err as { status?: number })?.status ?? 500
    return NextResponse.json({ error: message }, { status })
  }
}

// ── DELETE: remove a coupon by id (?id=...) ─────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const id = req.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing coupon id.' }, { status: 400 })
    }

    // Best-effort: remove the stored image too, if there is one.
    const { data: existing } = await supabase
      .from('admin_coupons')
      .select('image_url')
      .eq('id', id)
      .single()

    if (existing?.image_url) {
      await removeStoredImage(supabase, existing.image_url)
    }

    const { error } = await supabase.from('admin_coupons').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('DELETE /api/admin/coupons error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete coupon.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}