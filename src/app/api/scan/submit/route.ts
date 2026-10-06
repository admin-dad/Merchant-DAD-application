import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, customer_name, customer_phone, campaign_id, status } = body

    if (!merchant_id || !customer_name || !customer_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── DUPLICATE PARTICIPATION CHECK (Server-side to fix clock skew) ──
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const { data: recentScan } = await supabase
      .from('qr_scans')
      .select('created_at')
      .eq('merchant_id', merchant_id)
      .eq('customer_phone', customer_phone.trim())
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentScan && recentScan.length > 0) {
      return NextResponse.json({ error: 'cooldown' }, { status: 429 })
    }

    // Resolve current scan cost
    let scanCost = 4.0 // default fallback
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('category, sub_category, billing_rate')
      .eq('id', merchant_id)
      .maybeSingle()
      
    if (merchantData) {
      if (merchantData.category && merchantData.sub_category) {
        const { data: catRow } = await supabase
          .from('categories')
          .select('id')
          .eq('name', merchantData.category)
          .maybeSingle()
          
        if (catRow) {
          const { data: subRow } = await supabase
            .from('subcategories')
            .select('scan_amount')
            .eq('category_id', catRow.id)
            .eq('name', merchantData.sub_category)
            .maybeSingle()
            
          if (subRow && subRow.scan_amount !== null && Number(subRow.scan_amount) > 0) {
            scanCost = Number(subRow.scan_amount)
          } else if (merchantData.billing_rate && Number(merchantData.billing_rate) > 0) {
            scanCost = Number(merchantData.billing_rate)
          }
        } else if (merchantData.billing_rate && Number(merchantData.billing_rate) > 0) {
          scanCost = Number(merchantData.billing_rate)
        }
      } else if (merchantData.billing_rate && Number(merchantData.billing_rate) > 0) {
        scanCost = Number(merchantData.billing_rate)
      }
    }

    const { data, error } = await supabase
      .from('qr_scans')
      .insert([
        {
          merchant_id,
          customer_name,
          customer_phone,
          status: status || 'Pending',
          campaign_id: campaign_id || null,
          scan_cost: scanCost,
        },
      ])
      .select('id')
      .single()

    if (error) {
      console.error('API /scan/submit insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── COUNT CHRONOLOGICAL SCANS FOR THIS CAMPAIGN GLOBALLY ──
    let currentScanCount = 0
    if (campaign_id) {
      const { count } = await supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign_id)
      
      currentScanCount = count || 1 // count includes the one we just inserted, if count is 0 for some reason fallback to 1
    }

    return NextResponse.json({ id: data.id, scan_number: currentScanCount })
  } catch (err: any) {
    console.error('API /scan/submit exception:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
