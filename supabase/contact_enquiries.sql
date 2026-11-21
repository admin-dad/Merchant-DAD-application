begin;
create table if not exists public.contact_enquiries (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check(char_length(trim(full_name)) between 1 and 120),
 phone text not null check(char_length(trim(phone)) between 7 and 30),
 email text not null check(char_length(email) between 3 and 254),
 topic text not null check(char_length(topic) between 1 and 120),
 message text not null check(char_length(trim(message)) between 1 and 5000),
 created_at timestamptz not null default now()
);
alter table public.contact_enquiries enable row level security;
revoke all on public.contact_enquiries from anon,authenticated;
grant insert(full_name,phone,email,topic,message) on public.contact_enquiries to anon,authenticated;
grant select on public.contact_enquiries to authenticated;
drop policy if exists "Submit enquiry" on public.contact_enquiries;
create policy "Submit enquiry" on public.contact_enquiries for insert to anon,authenticated with check(true);
drop policy if exists "Admins read enquiries" on public.contact_enquiries;
create policy "Admins read enquiries" on public.contact_enquiries for select to authenticated using(exists(select 1 from public.admin where id=auth.uid()));
create index if not exists contact_enquiries_created_idx on public.contact_enquiries(created_at desc);
commit;
