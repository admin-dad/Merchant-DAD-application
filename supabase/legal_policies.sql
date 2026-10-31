-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Uses your existing public.admin table, whose id is the admin auth user ID.
begin;

create table if not exists public.legal_policies (
  slug text primary key check (slug in ('terms', 'privacy', 'refund-policy', 'merchant-agreement', 'customer-agreement')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  sections jsonb not null check (jsonb_typeof(sections) = 'array'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Upgrade the allowed slugs on existing installations as well.
alter table public.legal_policies drop constraint if exists legal_policies_slug_check;
alter table public.legal_policies add constraint legal_policies_slug_check
  check (slug in ('terms', 'privacy', 'refund-policy', 'merchant-agreement', 'customer-agreement'));

-- Definer lookup avoids depending on client visibility into the admin table.
create or replace function public.can_manage_legal_policies()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin where id = (select auth.uid())); $$;
revoke all on function public.can_manage_legal_policies() from public;
grant execute on function public.can_manage_legal_policies() to authenticated;

create or replace function public.validate_legal_policy()
returns trigger language plpgsql set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(new.sections) is distinct from 'array' then
    raise exception 'Policy sections must be an array';
  end if;
  if jsonb_array_length(new.sections) not between 1 and 100 then
    raise exception 'A policy needs between 1 and 100 sections';
  end if;
  for item in select value from jsonb_array_elements(new.sections) loop
    if jsonb_typeof(item) is distinct from 'object'
       or jsonb_typeof(item->'title') is distinct from 'string'
       or jsonb_typeof(item->'body') is distinct from 'string'
       or char_length(btrim(item->>'title')) not between 1 and 200
       or char_length(btrim(item->>'body')) not between 1 and 20000 then
      raise exception 'Each section needs a heading (1-200 characters) and content (1-20000 characters)';
    end if;
  end loop;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
revoke all on function public.validate_legal_policy() from public;
drop trigger if exists validate_legal_policy on public.legal_policies;
create trigger validate_legal_policy before insert or update on public.legal_policies
for each row execute function public.validate_legal_policy();

alter table public.legal_policies enable row level security;
revoke all on public.legal_policies from anon, authenticated;
grant select on public.legal_policies to anon, authenticated;
grant insert, update on public.legal_policies to authenticated;

drop policy if exists "Anyone can read legal policies" on public.legal_policies;
create policy "Anyone can read legal policies" on public.legal_policies
for select to anon, authenticated using (true);
drop policy if exists "Admins can add legal policies" on public.legal_policies;
create policy "Admins can add legal policies" on public.legal_policies
for insert to authenticated with check ((select public.can_manage_legal_policies()));
drop policy if exists "Admins can update legal policies" on public.legal_policies;
create policy "Admins can update legal policies" on public.legal_policies
for update to authenticated using ((select public.can_manage_legal_policies()))
with check ((select public.can_manage_legal_policies()));

-- Preserve published edits when this migration is run again.
insert into public.legal_policies (slug, title, description, sections) values
('terms', 'Terms & Conditions', 'Please read these terms and conditions carefully before using our platform, registering as a merchant partner, or participating in loyalty campaigns.', '[{"title": "1. Acceptance of Terms", "body": "By accessing and registering on our platform as a merchant or user, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using our services."}, {"title": "2. Merchant Accounts & Registration", "body": "Merchant partners must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account."}, {"title": "3. Rewards, Benefits & Campaigns", "body": "Platform benefits, e-commerce reward points, promotional pricing, and campaign access are subject to eligibility criteria, merchant categories, and active membership levels managed by the administration."}, {"title": "4. User Privacy & Data Protection", "body": "We respect your data and maintain robust security standards. All personal and business data provided is utilized strictly for platform operations, merchant analytics, and verified communication services."}, {"title": "5. Modifications & Updates", "body": "We reserve the right to update, modify, or replace any part of these Terms and Conditions at our sole discretion. Continued use of the platform following any changes constitutes acceptance of those changes."}, {"title": "6. Governing Law", "body": "These terms shall be governed by and construed in accordance with local regulatory guidelines and applicable commercial laws without regard to conflict of law provisions."}]'::jsonb),
('privacy', 'Privacy Policy', 'Learn how we collect, use, and protect your personal and business information.', '[{"title": "1. Information We Collect", "body": "We collect information you provide directly during registration, including merchant business details, contact numbers, email addresses, and operational categories required for ecosystem access."}, {"title": "2. How We Use Your Data", "body": "Your data is utilized to manage merchant accounts, deliver personalized reward points, process commercial discounts, facilitate campaign participation, and improve overall platform functionality."}, {"title": "3. Data Security & Protection", "body": "We implement robust technical and organizational security measures to protect your sensitive business records against unauthorized access, alteration, disclosure, or destruction."}, {"title": "4. Information Sharing", "body": "We do not sell or trade your personal or business information. Data is only shared with verified service partners or administrators strictly bound by confidentiality obligations."}, {"title": "5. Cookie Tracking & Analytics", "body": "Our platform uses secure cookies and analytics tools to enhance user experience, remember your preferences, and analyze traffic patterns across our web application."}, {"title": "6. Your Privacy Rights", "body": "You retain the right to access, update, or request the deletion of your account information by reaching out directly to our administrative and support team."}]'::jsonb),
('refund-policy', 'Refund Policy', 'Review our refund, cancellation, and return guidelines before making a payment.', '[{"title": "1. Eligibility for Refunds", "body": "Refund requests are evaluated based on subscription plans, merchant membership tiers, and specific e-commerce transaction guidelines managed within the platform."}, {"title": "2. Subscription & Membership Fees", "body": "Active merchant membership plans or promotional service fees are generally non-refundable once activated, except under special administrative review or billing discrepancies."}, {"title": "3. Processing Timeline", "body": "Approved refunds are processed through secure banking channels or original payment methods within 5-7 business days, depending on your financial institution."}, {"title": "4. E-Commerce & Product Returns", "body": "Product purchases made across the platform follow individual vendor return policies, requiring items to be unused and in original packaging for valid claims."}, {"title": "5. Dispute Resolution", "body": "If you encounter any discrepancies regarding billing, reward point redemptions, or campaign fees, our support team investigates and resolves issues promptly."}, {"title": "6. Requesting Support", "body": "To initiate a refund or billing inquiry, please reach out directly through our contact page with your registered merchant details and transaction reference numbers."}]'::jsonb),
('merchant-agreement', 'Merchant Agreement', 'Review the terms, responsibilities, and operational guidelines governing your merchant partnership.', '[{"title": "1. Partnership Scope & Onboarding", "body": "By registering as a merchant partner, you agree to participate in our digital ecosystem, utilizing merchant dashboards, QR campaign features, and promotional tools provided by the platform."}, {"title": "2. Merchant Responsibilities", "body": "Merchants are required to maintain accurate business profiles, provide verified retail category details, and honor valid e-commerce orders, reward point redemptions, and promotional discounts."}, {"title": "3. Benefits & Rewards Structure", "body": "Merchant benefits, commercial discounts, and referral incentives are assigned dynamically based on membership level, active participation, and administrative configurations."}, {"title": "4. QR Code & Campaign Terms", "body": "Promotional scratch cards, lucky number contests, and campaign QR assets deployed at merchant locations must be utilized in accordance with platform guidelines and promotional terms."}, {"title": "5. Account Security & Compliance", "body": "Partners must ensure secure handling of login credentials and dashboard data. Unauthorized use, fraudulent activities, or policy violations may result in suspension or termination of partnership."}, {"title": "6. Agreement Modifications", "body": "We reserve the right to update or modify these merchant agreement terms as the ecosystem evolves. Continued participation on the platform signifies ongoing acceptance of updated terms."}]'::jsonb)
on conflict (slug) do nothing;

insert into public.legal_policies (slug, title, description, sections) values
('customer-agreement', 'Customer Agreement', 'This Customer Agreement outlines your rights and responsibilities when using our platform:', '[{"title": "1. Data Privacy", "body": "We only collect information necessary to track your rewards and ensure fair participation. Your data is not sold to third parties."}, {"title": "2. Communication", "body": "By participating, you agree to receive transactional notifications regarding your rewards and redemptions."}, {"title": "3. Fair Usage", "body": "You agree to use the platform fairly and respect merchant rules when claiming physical or digital goods in-store."}, {"title": "4. Accountability", "body": "Any fraudulent activity, including the use of automated bots or duplicate accounts, violates this agreement."}, {"title": "5. Updates", "body": "This agreement may be updated periodically to reflect new features and legal requirements."}]'::jsonb)
on conflict (slug) do nothing;

commit;
