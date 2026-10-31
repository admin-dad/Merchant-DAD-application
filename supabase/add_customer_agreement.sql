-- Existing installation: run this after legal_policies.sql has created the table.
begin;

alter table public.legal_policies drop constraint if exists legal_policies_slug_check;
alter table public.legal_policies add constraint legal_policies_slug_check
  check (slug in ('terms', 'privacy', 'refund-policy', 'merchant-agreement', 'customer-agreement'));

insert into public.legal_policies (slug, title, description, sections) values
('customer-agreement', 'Customer Agreement', 'This Customer Agreement outlines your rights and responsibilities when using our platform:', '[{"title": "1. Data Privacy", "body": "We only collect information necessary to track your rewards and ensure fair participation. Your data is not sold to third parties."}, {"title": "2. Communication", "body": "By participating, you agree to receive transactional notifications regarding your rewards and redemptions."}, {"title": "3. Fair Usage", "body": "You agree to use the platform fairly and respect merchant rules when claiming physical or digital goods in-store."}, {"title": "4. Accountability", "body": "Any fraudulent activity, including the use of automated bots or duplicate accounts, violates this agreement."}, {"title": "5. Updates", "body": "This agreement may be updated periodically to reflect new features and legal requirements."}]'::jsonb)
on conflict (slug) do nothing;

commit;
