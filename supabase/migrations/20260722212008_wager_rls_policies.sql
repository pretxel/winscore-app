-- ============= RLS Policies for Wager Tables =============
-- Members can read only wager data for pools they belong to.
-- Users can read their own links/intents/entries.
-- Pool owners can configure only their pools.
-- Administrators have full access.
-- Private challenges are owner-only.

-- group_wager_configs: pool members can read; owners can insert/update; admins full
create policy wager_configs_select_members
  on public.group_wager_configs for select
  to authenticated
  using (public.is_group_member(group_id));

create policy wager_configs_admin_full
  on public.group_wager_configs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_rounds: pool members can read; admins full
create policy wager_rounds_select_members
  on public.wager_rounds for select
  to authenticated
  using (public.is_group_member(group_id));

create policy wager_rounds_admin_full
  on public.wager_rounds for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wallet_link_challenges: owner-only read
create policy wallet_link_challenges_select_owner
  on public.wallet_link_challenges for select
  to authenticated
  using (user_id = auth.uid());

create policy wallet_link_challenges_admin_full
  on public.wallet_link_challenges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wallet_links: owner reads own; admins full
create policy wallet_links_select_owner
  on public.wallet_links for select
  to authenticated
  using (user_id = auth.uid());

create policy wallet_links_admin_full
  on public.wallet_links for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_intents: owner reads own + pool members see their pool's
create policy wager_intents_select_owner
  on public.wager_intents for select
  to authenticated
  using (user_id = auth.uid());

create policy wager_intents_select_members
  on public.wager_intents for select
  to authenticated
  using (public.is_group_member(group_id));

create policy wager_intents_admin_full
  on public.wager_intents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_entries: owner reads own; pool members read; admins full
create policy wager_entries_select_owner
  on public.wager_entries for select
  to authenticated
  using (user_id = auth.uid());

create policy wager_entries_select_members
  on public.wager_entries for select
  to authenticated
  using (public.is_group_member(group_id));

create policy wager_entries_admin_full
  on public.wager_entries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_entry_predictions: inherited via intent/entry; pool members; admins
create policy wager_entry_predictions_select_via_intent
  on public.wager_entry_predictions for select
  to authenticated
  using (
    exists (
      select 1 from public.wager_intents wi
      where wi.id = wager_entry_predictions.intent_id
        and (wi.user_id = auth.uid() or public.is_group_member(wi.group_id))
    )
  );

create policy wager_entry_predictions_admin_full
  on public.wager_entry_predictions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_settlements: pool members can read; admins full
create policy wager_settlements_select_members
  on public.wager_settlements for select
  to authenticated
  using (
    exists (
      select 1 from public.wager_rounds wr
      where wr.id = wager_settlements.wager_round_id
        and public.is_group_member(wr.group_id)
    )
  );

create policy wager_settlements_admin_full
  on public.wager_settlements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_claims: owner reads own; pool members read; admins full
create policy wager_claims_select_owner
  on public.wager_claims for select
  to authenticated
  using (user_id = auth.uid());

create policy wager_claims_select_members
  on public.wager_claims for select
  to authenticated
  using (
    exists (
      select 1 from public.wager_rounds wr
      where wr.id = wager_claims.wager_round_id
        and public.is_group_member(wr.group_id)
    )
  );

create policy wager_claims_admin_full
  on public.wager_claims for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- wager_chain_events: pool members via intent; admins full
create policy wager_chain_events_select_via_intent
  on public.wager_chain_events for select
  to authenticated
  using (
    exists (
      select 1 from public.wager_intents wi
      where wi.id = wager_chain_events.intent_id
        and (wi.user_id = auth.uid() or public.is_group_member(wi.group_id))
    )
  );

create policy wager_chain_events_admin_full
  on public.wager_chain_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
