import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
const escapeHTML=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
export async function POST(request:Request){
 const session=await createClient();const {data:{user}}=await session.auth.getUser();if(!user?.email)return NextResponse.json({error:'Login required'},{status:401});
 const sender=process.env.GMAIL_SMTP_USER;const password=process.env.GMAIL_SMTP_APP_PASSWORD;if(!sender||!password)return NextResponse.json({error:'Order email is not configured.'},{status:503});
 const client=createAdminClient();let claimedId:string|null=null
 try{const {orderId}=await request.json();if(typeof orderId!=='string')return NextResponse.json({error:'Invalid order'},{status:400});const {data:merchant}=await client.from('merchants').select('id,business_name').eq('user_id',user.id).single();if(!merchant)return NextResponse.json({error:'Merchant not found'},{status:403});const {data:order,error}=await client.from('orders').select('*,order_items(*)').eq('id',orderId).eq('merchant_id',merchant.id).single();if(error||!order)return NextResponse.json({error:'Order not found'},{status:404});if(order.status!=='completed'||!order.order_items?.length)return NextResponse.json({error:'Order is not ready for confirmation'},{status:409});
 const {data:claim,error:claimError}=await client.from('orders').update({confirmation_email_status:'sending'}).eq('id',orderId).in('confirmation_email_status',['pending','failed']).select('id').maybeSingle();if(claimError)throw claimError;if(!claim)return NextResponse.json({message:'Confirmation already sent or processing'});claimedId=orderId;
 const lines=order.order_items.map((item:{name:string;quantity:number;price:number})=>`${item.name} × ${item.quantity} — ${Number(item.price)*item.quantity} points`).join('\n');
 const text=`Hello ${merchant.business_name},\n\nYour Merchant DAD order is confirmed.\nOrder: ${order.id}\nDate: ${new Date(order.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}\n\n${lines}\n\nTotal: ${order.total_amount} points\nShipping address: ${order.shipping_address||'Not provided'}\n\nYou can track this order in Shop → Orders.\nThank you,\nMerchant DAD`;
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:sender,pass:password},connectionTimeout:10000,socketTimeout:15000});
 await transport.sendMail({from:{name:'Merchant DAD',address:sender},to:user.email,subject:`Order confirmed · ${order.id.slice(0,8).toUpperCase()}`,text,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a"><h1 style="color:#1857d6">Your order is confirmed</h1><p style="white-space:pre-wrap;line-height:1.7">${escapeHTML(text)}</p></div>`});
 const {error:saveError}=await client.from('orders').update({confirmation_email_status:'sent',confirmation_email_sent_at:new Date().toISOString()}).eq('id',orderId);if(saveError)return NextResponse.json({message:'Email sent; status update requires attention'});return NextResponse.json({success:true});
 }catch{if(claimedId)await client.from('orders').update({confirmation_email_status:'failed'}).eq('id',claimedId);return NextResponse.json({error:'Could not send order email. Your order is still saved.'},{status:500})}
}
