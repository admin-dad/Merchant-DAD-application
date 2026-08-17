import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { merchantId, customerPhone, customerName } = await req.json()

  try {
    // 1. Fetch scan_bonus_points from points_config
    const { data: config, error: configError } = await supabase
      .from('points_config')
      .select('scan_bonus_points')
      .eq('id', 1)
      .single()

    if (configError) throw configError

    const scanBonus = config?.scan_bonus_points || 0

    // 2. Insert new scan record into qr_scans
    const { data: scan, error: scanError } = await supabase
      .from('qr_scans')
      .insert([
        {
          merchant_id: merchantId,
          customer_phone: customerPhone,
          customer_name: customerName,
          status: 'Pending',
          fulfillment_status: 'Pending',
        },
      ])
      .select()
      .single()

    if (scanError) throw scanError

    // 3. If scan_bonus_points exist, update merchant points and log transaction
    if (scanBonus > 0) {
      // Get current points
      const { data: merchant } = await supabase
        .from('merchants')
        .select('purchased_points')
        .eq('id', merchantId)
        .single()

      const updatedPoints = (merchant?.purchased_points || 0) + scanBonus

      // Update merchant
      await supabase
        .from('merchants')
        .update({ purchased_points: updatedPoints })
        .eq('id', merchantId)

      // Add transaction history record
      await supabase.from('merchant_transactions').insert([
        {
          merchant_id: merchantId,
          wallet_type: 'points',
          transaction_type: 'credit',
          amount: scanBonus,
          description: `Scan bonus points added for ${customerPhone}`,
        },
      ])
    }

    return NextResponse.json({ success: true, scan, pointsAwarded: scanBonus })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}