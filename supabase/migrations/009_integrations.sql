-- ═══════════════════════════════════════════════════════════════════════════
-- WAB — Integrations & Unified Financial Data Layer
-- Additive only. No existing table, column or policy is modified or dropped.
--
-- Model:
--   provider_connections   one row per connected provider instance (org scoped)
--   provider_credentials   encrypted secrets; NO RLS policies => service-role only
--   provider_accounts      normalized accounts reported by a provider
--   provider_transactions  normalized transactions (dedupe_key enforces idempotency)
--   provider_sync_runs     durable sync job state (retry-safe)
--   provider_events        idempotent inbound webhook/event inbox
--   integration_audit      immutable audit trail for connection lifecycle
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Connections ────────────────────────────────────────────────────────────
create table if not exists public.provider_connections (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  provider           text not null,                    -- registry id, e.g. binance
  category           text not null,                    -- exchange | brokerage | wallet | accounting | custom | import
  label              text not null,
  status             text not null default 'unconfigured'
                     check (status in ('unconfigured','connected','error','paused','disconnected')),
  -- Absolute truth about whether usable credentials exist. Never set by the UI.
  credentials_set    boolean not null default false,
  permissions        jsonb not null default '{}'::jsonb,   -- capabilities the provider actually granted
  config             jsonb not null default '{}'::jsonb,   -- non-secret settings
  last_sync_at       timestamptz,
  last_sync_status   text,
  last_error         text,
  last_error_at      timestamptz,
  consecutive_errors int not null default 0,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists provider_connections_org_idx
  on public.provider_connections (org_id, category, provider);
create unique index if not exists provider_connections_org_label_uniq
  on public.provider_connections (org_id, provider, lower(label));

-- ── Encrypted credentials (service-role only) ──────────────────────────────
create table if not exists public.provider_credentials (
  connection_id uuid primary key references public.provider_connections(id) on delete cascade,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  ciphertext    text not null,
  iv            text not null,
  auth_tag      text not null,
  key_version   int  not null default 1,
  rotated_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS on with zero policies: even an authenticated user cannot read ciphertext.
alter table public.provider_credentials enable row level security;

-- ── Normalized accounts ────────────────────────────────────────────────────
create table if not exists public.provider_accounts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  connection_id    uuid not null references public.provider_connections(id) on delete cascade,
  external_id      text not null,
  account_type     text not null default 'trading',
  currency         text not null default 'USD',
  balance          numeric(28,10),
  available        numeric(28,10),
  as_of            timestamptz not null default now(),
  source_ref       text,
  raw              jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index if not exists provider_accounts_org_idx
  on public.provider_accounts (org_id, connection_id);

-- ── Normalized transactions ────────────────────────────────────────────────
create table if not exists public.provider_transactions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  connection_id     uuid not null references public.provider_connections(id) on delete cascade,
  account_external_id text,
  external_id       text not null,
  -- Stable, provider-independent identity used for idempotent upserts.
  dedupe_key        text not null,
  kind              text not null default 'trade'
                    check (kind in ('trade','order','execution','cash','fee','dividend','settlement','transfer','adjustment')),
  side              text check (side in ('buy','sell','deposit','withdrawal')),
  instrument        text,
  quantity          numeric(28,10),
  price             numeric(28,10),
  amount            numeric(28,10),
  fees              numeric(28,10) not null default 0,
  currency          text not null default 'USD',
  occurred_at       timestamptz not null,
  settled_at        timestamptz,
  source_ref        text,
  raw               jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (connection_id, dedupe_key)
);

create index if not exists provider_transactions_org_time_idx
  on public.provider_transactions (org_id, occurred_at desc);
create index if not exists provider_transactions_conn_idx
  on public.provider_transactions (connection_id, occurred_at desc);

-- ── Sync runs (durable job state) ──────────────────────────────────────────
create table if not exists public.provider_sync_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.provider_connections(id) on delete cascade,
  request_id    text,                      -- caller-supplied idempotency key
  trigger       text not null default 'manual'
                check (trigger in ('manual','schedule','webhook','retry')),
  status        text not null default 'running'
                check (status in ('running','succeeded','failed','partial')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  accounts_upserted     int not null default 0,
  transactions_upserted int not null default 0,
  transactions_skipped  int not null default 0,
  error         text,
  metadata      jsonb not null default '{}'::jsonb
);

create unique index if not exists provider_sync_runs_request_uniq
  on public.provider_sync_runs (connection_id, request_id)
  where request_id is not null;
create index if not exists provider_sync_runs_conn_idx
  on public.provider_sync_runs (connection_id, started_at desc);

-- ── Inbound event inbox (idempotent) ───────────────────────────────────────
create table if not exists public.provider_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  connection_id   uuid references public.provider_connections(id) on delete cascade,
  provider        text not null,
  kind            text not null,
  idempotency_key text not null,
  payload         jsonb not null default '{}'::jsonb,
  signature_ok    boolean,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  attempts        int not null default 0,
  last_error      text,
  unique (org_id, provider, idempotency_key)
);

create index if not exists provider_events_pending_idx
  on public.provider_events (org_id, processed_at)
  where processed_at is null;

-- ── Immutable audit trail ──────────────────────────────────────────────────
create table if not exists public.integration_audit (
  id            bigserial primary key,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.provider_connections(id) on delete set null,
  actor_id      uuid references auth.users(id) on delete set null,
  action        text not null,             -- created | tested | synced | disconnected | rotated | failed
  detail        jsonb not null default '{}'::jsonb,  -- never contains secrets
  created_at    timestamptz not null default now()
);

create index if not exists integration_audit_org_idx
  on public.integration_audit (org_id, created_at desc);

-- ── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists provider_connections_touch on public.provider_connections;
create trigger provider_connections_touch
  before update on public.provider_connections
  for each row execute function public.touch_updated_at();

drop trigger if exists provider_accounts_touch on public.provider_accounts;
create trigger provider_accounts_touch
  before update on public.provider_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists provider_transactions_touch on public.provider_transactions;
create trigger provider_transactions_touch
  before update on public.provider_transactions
  for each row execute function public.touch_updated_at();

-- ── RLS: organization isolation ────────────────────────────────────────────
-- Membership helper: the org a user belongs to via profiles.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where user_id = auth.uid() limit 1;
$$;

alter table public.provider_connections   enable row level security;
alter table public.provider_accounts      enable row level security;
alter table public.provider_transactions  enable row level security;
alter table public.provider_sync_runs     enable row level security;
alter table public.provider_events        enable row level security;
alter table public.integration_audit      enable row level security;

-- Connections: members may read; only owner/admin may write.
drop policy if exists provider_connections_select on public.provider_connections;
create policy provider_connections_select on public.provider_connections
  for select using (org_id = public.current_org_id());

drop policy if exists provider_connections_insert on public.provider_connections;
create policy provider_connections_insert on public.provider_connections
  for insert with check (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('owner','admin')
    )
  );

drop policy if exists provider_connections_update on public.provider_connections;
create policy provider_connections_update on public.provider_connections
  for update using (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('owner','admin')
    )
  );

drop policy if exists provider_connections_delete on public.provider_connections;
create policy provider_connections_delete on public.provider_connections
  for delete using (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('owner','admin')
    )
  );

-- Read-only derived data for any org member.
drop policy if exists provider_accounts_select on public.provider_accounts;
create policy provider_accounts_select on public.provider_accounts
  for select using (org_id = public.current_org_id());

drop policy if exists provider_transactions_select on public.provider_transactions;
create policy provider_transactions_select on public.provider_transactions
  for select using (org_id = public.current_org_id());

drop policy if exists provider_sync_runs_select on public.provider_sync_runs;
create policy provider_sync_runs_select on public.provider_sync_runs
  for select using (org_id = public.current_org_id());

drop policy if exists provider_events_select on public.provider_events;
create policy provider_events_select on public.provider_events
  for select using (org_id = public.current_org_id());

drop policy if exists integration_audit_select on public.integration_audit;
create policy integration_audit_select on public.integration_audit
  for select using (org_id = public.current_org_id());

-- Writes to derived tables happen only through the service role (server sync),
-- so no INSERT/UPDATE policies are defined for them by design.
