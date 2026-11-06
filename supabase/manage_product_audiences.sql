begin;
create table if not exists public.product_audiences (
 value text primary key check (value ~ '^[a-z0-9_]+$'),
 label text not null check (length(trim(label)) > 0),
 sort_order integer not null default 0
);
insert into public.product_audiences(value,label,sort_order) values
('men','Men',1),('women','Women',2),('unisex','Unisex',3),('kids','Kids',4),
('boys','Boys',5),('girls','Girls',6),('babies','Babies',7),('other','Other',8)
on conflict do nothing;
alter table public.products add column if not exists target_audience text default 'other';
alter table public.products drop constraint if exists products_target_audience_check;
insert into public.product_audiences(value,label)
select distinct target_audience, initcap(replace(target_audience,'_',' ')) from public.products
where target_audience is not null on conflict do nothing;
alter table public.product_audiences enable row level security;
drop policy if exists audiences_read on public.product_audiences;
create policy audiences_read on public.product_audiences for select to authenticated using (true);
drop policy if exists audiences_admin on public.product_audiences;
create policy audiences_admin on public.product_audiences for all to authenticated
using (exists(select 1 from public.admin where id=auth.uid()))
with check (exists(select 1 from public.admin where id=auth.uid()));
grant select,insert,update,delete on public.product_audiences to authenticated;
commit;
