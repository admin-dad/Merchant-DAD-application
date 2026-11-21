begin;
alter table public.orders add column if not exists confirmation_email_status text not null default 'pending' check(confirmation_email_status in ('pending','sending','sent','failed'));
alter table public.orders add column if not exists confirmation_email_sent_at timestamptz;
commit;
