import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select(
        `
        id,
        name,
        winning_probability,
        prize_details,
        total_cards,
        winning_numbers,
        gift_id,
        gift:gifts ( id, name, description, image_url )
        `
      )
      .eq('status', 'active')
      .eq('type', 'customer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 500 })
    }

    if (!campaignData) {
      return NextResponse.json({ campaign: null, count: 0 })
    }

    // Check inventory limit
    const { count, error: countError } = await supabase
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignData.id)

    if (countError) {
      console.error('API /scan/active-campaign count error:', countError)
    }

    return NextResponse.json({ 
      campaign: campaignData, 
      count: count || 0 
    })
  } catch (err: any) {
    console.error('API /scan/active-campaign exception:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
