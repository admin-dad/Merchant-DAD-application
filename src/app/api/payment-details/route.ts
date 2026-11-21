import { NextResponse } from 'next/server'
import { createClient, createAdminClient as adminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'
export async function GET(){
 const merchantClient=await createClient();const adminClient=await adminSession();
 const [merchantAuth,adminAuth]=await Promise.all([merchantClient.auth.getUser(),adminClient.auth.getUser()]);
 let allowed=false;
 if(merchantAuth.data.user){const {data}=await merchantClient.from('merchants').select('id').eq('user_id',merchantAuth.data.user.id).maybeSingle();allowed=!!data}
 if(!allowed&&adminAuth.data.user){const {data}=await adminClient.from('admin').select('id').eq('id',adminAuth.data.user.id).maybeSingle();allowed=!!data}
 if(!allowed)return NextResponse.json({error:'Merchant or admin login required'},{status:401});
 try{const {data,error}=await createAdminClient().from('settings').select('key,value').in('key',KEYS);if(error)throw error;const details:Record<string,string>={};for(const row of data??[])if(typeof row.value==='string'||typeof row.value==='boolean')details[row.key]=String(row.value);return NextResponse.json(details,{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'Could not load payment details'},{status:500})}
}
const KEYS = ['payment_qr_url', 'payment_upi_id', 'payment_bank_name', 'payment_account_name', 'payment_account_number', 'payment_ifsc', 'buy_points_enabled', 'subscription_payments_enabled']
