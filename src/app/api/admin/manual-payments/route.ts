import { NextResponse } from 'next/server'
import { createAdminClient as createSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function PATCH(request:Request){
 const session=await createSession();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});const {data:admin}=await session.from('admin').select('id').eq('id',user.id).maybeSingle();if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 try{const {id,status}=await request.json();if(typeof id!=='string'||!['verified','rejected'].includes(status))return NextResponse.json({error:'Invalid payment decision'},{status:400});const {data,error}=await createAdminClient().from('manual_payment_requests').update({status}).eq('id',id).eq('status','pending').select('id,status').maybeSingle();if(error)throw error;if(!data)return NextResponse.json({error:'Payment was already reviewed. Refresh to see its status.'},{status:409});return NextResponse.json(data)}catch{return NextResponse.json({error:'Could not update payment review status'},{status:500})}
}
