-- Allow any org member to create and maintain connections, and to persist
-- live sync rows without a service-role key (the app writes as the user JWT).

drop policy if exists provider_connections_insert on public.provider_connections;
create policy provider_connections_insert on public.provider_connections
  for insert with check (org_id = public.current_org_id());

drop policy if exists provider_connections_update on public.provider_connections;
create policy provider_connections_update on public.provider_connections
  for update using (org_id = public.current_org_id());

drop policy if exists provider_connections_delete on public.provider_connections;
create policy provider_connections_delete on public.provider_connections
  for delete using (org_id = public.current_org_id());

drop policy if exists provider_accounts_write on public.provider_accounts;
create policy provider_accounts_write on public.provider_accounts
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists provider_transactions_write on public.provider_transactions;
create policy provider_transactions_write on public.provider_transactions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists provider_sync_runs_write on public.provider_sync_runs;
create policy provider_sync_runs_write on public.provider_sync_runs
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists integration_audit_write on public.integration_audit;
create policy integration_audit_write on public.integration_audit
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
