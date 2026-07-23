-- Allow authenticated users to create their own wallet-link challenges.
-- Previously only admins could insert (wallet_link_challenges_admin_full),
-- and regular users had select-only (wallet_link_challenges_select_owner).

create policy wallet_link_challenges_insert_owner
  on public.wallet_link_challenges for insert
  to authenticated
  with check (user_id = auth.uid());
