-- H3 viral: reverse-question link sent to a contact
-- The contact who receives the link answers 3 questions without logging in to fill in their own profile.
-- Response submission (public, no login) is handled only in a server route that uses the service role key,
-- while this table's own RLS stays owner-only (the user who created the link).

create table contact_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

create index contact_invites_contact_id_idx on contact_invites(contact_id);

alter table contact_invites enable row level security;

create policy "contact_invites_owner_all" on contact_invites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
