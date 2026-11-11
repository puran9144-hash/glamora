-- GLAMORA founder/company-admin RLS policies for the ACTUAL Phase 1 schema.
-- This SQL has already been applied to the connected GLAMORA project on 2026-11-10.
-- Do not run it again unless you intentionally reset/reconcile the database.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_glamora_admin_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('founder', 'company_admin')
  );
$$;
revoke all on function private.has_glamora_admin_access() from public;
grant execute on function private.has_glamora_admin_access() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'cities','stores','profiles','user_roles','seller_profiles','categories',
    'products','product_media','inventory','stock_movements','orders',
    'order_items','payments','deliveries','audit_logs'
  ] loop
    execute format('drop policy if exists glamora_admin_all on public.%I', t);
    execute format(
      'create policy glamora_admin_all on public.%I for all to authenticated using ((select private.has_glamora_admin_access())) with check ((select private.has_glamora_admin_access()))',
      t
    );
  end loop;
end $$;

drop policy if exists glamora_profile_self_select on public.profiles;
create policy glamora_profile_self_select on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists glamora_profile_self_update on public.profiles;
create policy glamora_profile_self_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant select on public.cities, public.stores, public.profiles, public.user_roles,
  public.seller_profiles, public.categories, public.products, public.product_media,
  public.inventory, public.stock_movements, public.orders, public.order_items,
  public.payments, public.deliveries, public.audit_logs to authenticated;
