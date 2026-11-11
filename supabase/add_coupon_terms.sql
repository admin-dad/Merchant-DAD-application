-- Run after legal_policies.sql in Supabase SQL Editor.
begin;
alter table public.legal_policies drop constraint if exists legal_policies_slug_check;
alter table public.legal_policies add constraint legal_policies_slug_check
 check (slug in ('terms','privacy','refund-policy','merchant-agreement','customer-agreement','coupon-terms'));
insert into public.legal_policies (slug,title,description,sections)
values ('coupon-terms','Coupon Terms & Conditions','Please review these terms before using a coupon.',
 '[{"title":"Coupon usage","body":"Review the eligibility, validity dates, discount and redemption requirements shown on each coupon before use. Contact the merchant or platform support if you need clarification."}]'::jsonb)
on conflict (slug) do nothing;
commit;
