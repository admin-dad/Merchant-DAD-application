-- Run in Supabase SQL Editor. Existing verified proofs are NOT applied automatically.
begin;
alter table public.manual_payment_requests add column if not exists benefits_applied_at timestamptz;
alter table public.manual_payment_requests add column if not exists reviewed_by uuid references auth.users(id);
create or replace function public.review_manual_payment(request_id uuid, decision text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.manual_payment_requests%rowtype; m public.merchants%rowtype; p public.subscription_plans%rowtype;
 pts numeric; rate numeric; months text[]; month_key text; expiry timestamptz; ids uuid[]; expected numeric;
begin
 if not exists(select 1 from public.admin where id=auth.uid()) then raise exception 'Admin access required'; end if;
 if decision not in ('verified','rejected') then raise exception 'Invalid decision'; end if;
 select * into r from public.manual_payment_requests where id=request_id for update;
 if not found then raise exception 'Payment not found'; end if;
 if r.benefits_applied_at is not null then return jsonb_build_object('id',r.id,'status',r.status,'already_applied',true); end if;
 if decision='rejected' then
  if r.status<>'pending' then raise exception 'Only pending payments can be rejected'; end if;
  update public.manual_payment_requests set status='rejected',reviewed_by=auth.uid() where id=r.id;
  return jsonb_build_object('id',r.id,'status','rejected');
 end if;
 if r.status not in ('pending','verified') then raise exception 'Rejected payment cannot be applied'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(r.utr_number)),0));
 if exists(select 1 from public.manual_payment_requests where id<>r.id and lower(trim(utr_number))=lower(trim(r.utr_number)) and benefits_applied_at is not null) then raise exception 'This transaction reference has already been applied'; end if;
 select * into m from public.merchants where id=r.merchant_id for update;
 if r.purpose='Points purchase' then
  pts := (r.metadata->>'points')::numeric;
  select value_per_point into rate from public.points_config where id=1;
  if pts is null or pts<=0 or pts<>trunc(pts) or rate is null or rate<=0 or round(pts*rate,2)<>round(r.amount,2) then raise exception 'Points and paid amount do not match the current point rate. Review this receipt manually.'; end if;
  insert into public.merchant_transactions(merchant_id,wallet_type,transaction_type,amount,description,category)
   values(r.merchant_id,'points','credit',pts,'Manual points purchase | Request '||r.id||' | UTR '||r.utr_number,'purchase');
  insert into public.merchant_payments(merchant_id,amount,payment_method,utr_number,status,payment_mode,remarks)
   values(r.merchant_id,r.amount,'manual',r.utr_number,'completed','points_purchase','Manual request '||r.id);
 elsif r.purpose like 'Subscription plan:%' then
  select * into p from public.subscription_plans where id=(r.metadata->>'plan_id')::uuid;
  if not found or round(p.price::numeric,2)<>round(r.amount,2) then raise exception 'Plan or amount does not match. Review the receipt manually.'; end if;
  expiry:=greatest(now(),coalesce(m.subscription_expires_at,now()));
  if p.billing_interval='monthly' then expiry:=expiry+interval '1 month'; elsif p.billing_interval='yearly' then expiry:=expiry+interval '1 year'; else raise exception 'This plan does not require payment'; end if;
  update public.merchants set subscription_plan_id=p.id,subscription_expires_at=expiry where id=m.id;
  insert into public.merchant_payments(merchant_id,plan_id,amount,payment_method,utr_number,status,payment_mode,remarks)
   values(m.id,p.id,r.amount,'manual',r.utr_number,'completed','subscription','Manual request '||r.id);
 elsif r.purpose='Monthly QR payment' then
  select array_agg(value) into months from jsonb_array_elements_text(r.metadata->'billing_months');
  if coalesce(array_length(months,1),0)=0 or m.billing_type<>'monthly' then raise exception 'Missing monthly billing details'; end if;
  if (select count(distinct x) from unnest(months) x)<>array_length(months,1) then raise exception 'Duplicate billing months'; end if;
  expected:=round(m.billing_rate::numeric*1.18,2);
  if expected<=0 or abs(expected*array_length(months,1)-r.amount)>0.02 then raise exception 'Monthly payment amount does not match'; end if;
  foreach month_key in array months loop
   if month_key !~ '^\d{4}-\d{2}$' then raise exception 'Invalid billing month'; end if;
   if exists(select 1 from public.merchant_payments where merchant_id=m.id and billing_month=month_key and payment_mode='monthly' and status in ('completed','approved')) then raise exception 'Month % is already paid',month_key; end if;
   insert into public.merchant_payments(merchant_id,amount,payment_method,utr_number,status,payment_mode,billing_month,remarks)
    values(m.id,expected,'manual',r.utr_number,'completed','monthly',month_key,'Manual request '||r.id);
  end loop;
 elsif r.purpose='Scan billing' then
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(r.metadata->'scan_ids');
  if coalesce(array_length(ids,1),0)=0 then raise exception 'Scan IDs missing. This older request needs a new scan payment submission.'; end if;
  if (select count(*) from public.qr_scans where id=any(ids) and merchant_id=m.id and coalesce(is_paid,false)=false and coalesce(payment_status,'')<>'paid')<>array_length(ids,1) then raise exception 'Some scans are already paid or do not belong to this merchant'; end if;
  if m.billing_rate<=0 or abs(round(array_length(ids,1)*m.billing_rate::numeric*1.18,2)-r.amount)>0.02 then raise exception 'Scan payment amount does not match'; end if;
  update public.qr_scans set is_paid=true,payment_status='paid' where id=any(ids) and merchant_id=m.id;
  insert into public.merchant_payments(merchant_id,amount,payment_method,utr_number,status,payment_mode,remarks)
   values(m.id,r.amount,'manual',r.utr_number,'completed','outstanding','Manual request '||r.id);
 else raise exception 'Unsupported payment purpose'; end if;
 update public.manual_payment_requests set status='verified',benefits_applied_at=now(),reviewed_by=auth.uid() where id=r.id;
 return jsonb_build_object('id',r.id,'status','verified','benefits_applied',true);
end;
$$;
revoke all on function public.review_manual_payment(uuid,text) from public;
grant execute on function public.review_manual_payment(uuid,text) to authenticated;
commit;
