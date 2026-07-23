-- Allow authenticated users to insert their own wallet links.
-- Previously only admins could insert (wallet_links_admin_full),
-- and regular users had select-only (wallet_links_select_owner).

create policy wallet_links_insert_owner
  on public.wallet_links for insert
  to authenticated
  with check (user_id = auth.uid());
