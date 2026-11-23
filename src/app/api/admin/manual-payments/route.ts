import { NextResponse } from 'next/server'
import { createAdminClient as createSession } from '@/lib/supabase/server'
export async function PATCH(request:Request){
 const session=await createSession();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});const {data:admin}=await session.from('admin').select('id').eq('id',user.id).maybeSingle();if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 try{const {id,status}=await request.json();if(typeof id!=='string'||!['verified','rejected'].includes(status))return NextResponse.json({error:'Invalid payment decision'},{status:400});const {data,error}=await session.rpc('review_manual_payment',{request_id:id,decision:status});if(error)return NextResponse.json({error:error.message.includes('transaction reference has already been applied')?'This UTR was already credited under another submission. Do not verify it again; reject the duplicate pending request.':error.message},{status:400});return NextResponse.json(data)}catch{return NextResponse.json({error:'Could not update payment review status'},{status:500})}
}
