-- Run after manual_payment_requests.sql to enforce OFF switches in the database.
begin;
create or replace function public.check_manual_payment_availability()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.purpose = 'Points purchase' and exists(select 1 from public.settings where key='buy_points_enabled' and value in ('false'::jsonb, '"false"'::jsonb)) then
  raise exception 'Buy Points is currently OFF';
 end if;
 if new.purpose like 'Subscription plan:%' and exists(select 1 from public.settings where key='subscription_payments_enabled' and value in ('false'::jsonb, '"false"'::jsonb)) then
  raise exception 'Subscription Payments are currently OFF';
 end if;
 return new;
end;
$$;
revoke all on function public.check_manual_payment_availability() from public;
drop trigger if exists check_manual_payment_availability on public.manual_payment_requests;
create trigger check_manual_payment_availability before insert on public.manual_payment_requests for each row execute function public.check_manual_payment_availability();
commit;
