begin;
insert into public.settings(key,value,description)
values('wallet_min_redeem_points','0'::jsonb,'Minimum available wallet points required for e-commerce redemption; 0 disables the minimum.') on conflict(key) do nothing;
create or replace function public.enforce_minimum_redemption_points()
returns trigger language plpgsql security definer set search_path = '' as $$
declare minimum_points numeric := 0; available_points numeric := 0;
begin
 select coalesce((value #>> '{}')::numeric,0) into minimum_points from public.settings where key='wallet_min_redeem_points';
 minimum_points := coalesce(minimum_points,0);
 if minimum_points <= 0 then return new; end if;
 perform id from public.merchants where id=new.merchant_id for update;
 select coalesce(sum(case when transaction_type='credit' then amount else -amount end),0) into available_points from public.merchant_transactions where merchant_id=new.merchant_id and wallet_type='points';
 if available_points < minimum_points then raise exception 'You need at least % available points to redeem products.', minimum_points; end if;
 return new;
end;
$$;
revoke all on function public.enforce_minimum_redemption_points() from public;
drop trigger if exists enforce_minimum_redemption_points on public.orders;
create trigger enforce_minimum_redemption_points before insert on public.orders for each row execute function public.enforce_minimum_redemption_points();
commit;
