create or replace function public.message_contacts()
returns table (id uuid, full_name text, roles text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name,
    coalesce((select array_agg(ur.role::text order by ur.role) from public.user_roles ur where ur.user_id = p.id), '{}')
  from public.profiles p
  where auth.uid() is not null and p.is_active and public.can_message(p.id)
  order by p.full_name
$$;
revoke execute on function public.message_contacts() from public, anon;
grant execute on function public.message_contacts() to authenticated;