begin;
create table if not exists public.manual_payment_requests (
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null references public.merchants(id),
 purpose text not null, amount numeric not null check(amount>0),
 metadata jsonb not null default '{}', utr_number text not null,
 proof_path text not null, status text not null default 'pending' check(status in ('pending','verified','rejected')),
 created_at timestamptz not null default now()
);
alter table public.manual_payment_requests enable row level security;
create policy "Merchants submit payment proof" on public.manual_payment_requests for insert to authenticated
 with check(status='pending' and exists(select 1 from public.merchants m where m.id=merchant_id and m.user_id=auth.uid()) and proof_path like auth.uid()::text || '/%');
create policy "Read payment requests" on public.manual_payment_requests for select to authenticated
 using(exists(select 1 from public.admin where id=auth.uid()) or exists(select 1 from public.merchants m where m.id=merchant_id and m.user_id=auth.uid()));
grant select,insert on public.manual_payment_requests to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,5242880,array['image/png','image/jpeg','image/webp','application/pdf']) on conflict(id) do nothing;
create policy "Upload own payment proof" on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Read own or admin payment proof" on storage.objects for select to authenticated using(bucket_id='payment-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.admin where id=auth.uid())));
commit;
