-- Allow authenticated users to update their own wallet links.
-- Required for deactivating a previous active link before linking a new one
-- (verify route) and for unlinking. Without this, the owner UPDATE affects zero
-- rows under RLS, leaving the old active link in place and causing re-linking to
-- fail with a duplicate key on wallet_links_active_user_idx.
--
-- Rollback:
-- drop policy if exists wallet_links_update_owner on public.wallet_links;

create policy wallet_links_update_owner
  on public.wallet_links for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
