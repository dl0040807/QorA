-- F3-5: flow where a contact answers a worry directly via a shared link.
-- Separate from contact_invites (the old F3-2 personality quiz); this collects answers to a specific worry.
create table worry_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid unique not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  worry_id uuid not null references worries(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  answer_1 text,
  answer_2 text,
  free_text text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

create index worry_invites_worry_id_idx on worry_invites(worry_id);
create index worry_invites_token_idx on worry_invites(token);

alter table worry_invites enable row level security;

-- Only the user who created a link can view/create their own invites.
-- The responding contact is not logged in, so saving responses is handled only on the server (service role).
create policy "worry_invites_select_own" on worry_invites
  for select using (auth.uid() = user_id);

create policy "worry_invites_insert_own" on worry_invites
  for insert with check (auth.uid() = user_id);
