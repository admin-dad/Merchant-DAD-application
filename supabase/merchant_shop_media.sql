-- Run the complete script in Supabase Dashboard > SQL Editor.
-- Uses the existing merchants table and authenticated merchant accounts.
begin;

alter table public.merchants
  add column if not exists shop_image_1_path text,
  add column if not exists shop_image_2_path text,
  add column if not exists shop_video_path text;

-- Files are private; signed URLs are generated when the profile is opened.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('merchant-shop-media', 'merchant-shop-media', false, 50000000,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: <auth-user-id>/<merchant-id>/<random-file-name>.
drop policy if exists "Merchants read their shop media" on storage.objects;
create policy "Merchants read their shop media" on storage.objects
for select to authenticated using (
  bucket_id = 'merchant-shop-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.merchants m where m.id::text = (storage.foldername(name))[2] and m.user_id = (select auth.uid()))
);
drop policy if exists "Merchants upload their shop media" on storage.objects;
create policy "Merchants upload their shop media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'merchant-shop-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.merchants m where m.id::text = (storage.foldername(name))[2] and m.user_id = (select auth.uid()))
);
drop policy if exists "Merchants remove their shop media" on storage.objects;
create policy "Merchants remove their shop media" on storage.objects
for delete to authenticated using (
  bucket_id = 'merchant-shop-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.merchants m where m.id::text = (storage.foldername(name))[2] and m.user_id = (select auth.uid()))
);

grant select (shop_image_1_path, shop_image_2_path, shop_video_path) on public.merchants to authenticated;

-- A narrow, ownership-checked write avoids granting any new ability to edit
-- unrelated merchant fields. The existing merchants RLS policies are unchanged.
create or replace function public.save_merchant_shop_media(
  p_merchant_id uuid, p_image_1 text, p_image_2 text, p_video text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_prefix text;
  v_path text;
begin
  if v_user is null or not exists (
    select 1 from public.merchants where id = p_merchant_id and user_id = v_user
  ) then
    raise exception 'Merchant profile access denied' using errcode = '42501';
  end if;
  v_prefix := v_user::text || '/' || p_merchant_id::text || '/';
  foreach v_path in array array[p_image_1, p_image_2, p_video] loop
    if v_path is not null then
      if left(v_path, length(v_prefix)) <> v_prefix
         or array_length(string_to_array(v_path, '/'), 1) <> 3
         or not exists (select 1 from storage.objects where bucket_id = 'merchant-shop-media' and name = v_path) then
        raise exception 'Invalid or missing shop media file' using errcode = '22023';
      end if;
    end if;
  end loop;
  update public.merchants set shop_image_1_path = p_image_1,
    shop_image_2_path = p_image_2, shop_video_path = p_video
  where id = p_merchant_id and user_id = v_user;
end;
$$;
revoke all on function public.save_merchant_shop_media(uuid, text, text, text) from public;
grant execute on function public.save_merchant_shop_media(uuid, text, text, text) to authenticated;

commit;
