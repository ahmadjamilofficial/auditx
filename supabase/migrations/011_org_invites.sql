-- Team invitations: owner/admin share a link; the invitee joins the org on signup/signin.

create table if not exists public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'analyst' check (role in ('admin','analyst','viewer')),
  token       text not null unique,
  invited_by  uuid,
  status      text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists org_invites_org_idx on public.org_invites (org_id, status);
create unique index if not exists org_invites_pending_email_uniq
  on public.org_invites (org_id, lower(email))
  where status = 'pending';

alter table public.org_invites enable row level security;

drop policy if exists org_invites_select on public.org_invites;
create policy org_invites_select on public.org_invites
  for select using (org_id = public.current_org_id());

drop policy if exists org_invites_insert on public.org_invites;
create policy org_invites_insert on public.org_invites
  for insert with check (org_id = public.current_org_id());

drop policy if exists org_invites_update on public.org_invites;
create policy org_invites_update on public.org_invites
  for update using (org_id = public.current_org_id());

drop policy if exists org_invites_delete on public.org_invites;
create policy org_invites_delete on public.org_invites
  for delete using (org_id = public.current_org_id());

create or replace function public.lookup_org_invite(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select o.name as org_name, i.role, i.email, i.status, i.expires_at
    into rec
  from public.org_invites i
  join public.organizations o on o.id = i.org_id
  where i.token = _token;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'org_name', rec.org_name,
    'role', rec.role,
    'email', rec.email,
    'status', rec.status,
    'expires_at', rec.expires_at
  );
end;
$$;

create or replace function public.accept_org_invite(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.org_invites;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in to accept this invite.';
  end if;

  select * into inv
  from public.org_invites
  where token = _token
  for update;

  if not found then
    raise exception 'This invite link is invalid.';
  end if;
  if inv.status <> 'pending' then
    raise exception 'This invite has already been used or revoked.';
  end if;
  if inv.expires_at < now() then
    raise exception 'This invite has expired.';
  end if;

  update public.profiles
     set org_id = inv.org_id,
         role = inv.role
   where user_id = uid;

  if not found then
    raise exception 'Your profile is not ready yet. Finish signup and try the invite again.';
  end if;

  update public.org_invites
     set status = 'accepted',
         accepted_at = now()
   where id = inv.id;

  return jsonb_build_object('ok', true, 'org_id', inv.org_id, 'role', inv.role);
end;
$$;

grant execute on function public.lookup_org_invite(text) to anon, authenticated;
grant execute on function public.accept_org_invite(text) to authenticated;
