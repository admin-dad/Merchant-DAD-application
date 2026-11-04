-- Run in Supabase SQL Editor before using the new product audience selector.
begin;

alter table public.products add column if not exists target_audience text default 'other';
update public.products set target_audience = 'other' where target_audience is null;
alter table public.products alter column target_audience set default 'other';
alter table public.products alter column target_audience set not null;
alter table public.products drop constraint if exists products_target_audience_check;
alter table public.products add constraint products_target_audience_check
  check (target_audience in ('men', 'women', 'unisex', 'kids', 'boys', 'girls', 'babies', 'other'));

comment on column public.products.target_audience is 'Product audience selected by admin and used by merchant shop filters.';
commit;
