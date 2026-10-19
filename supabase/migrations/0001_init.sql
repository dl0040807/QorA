-- Gomin Tester AI - initial schema
-- Run in the Supabase SQL Editor or apply with `supabase db push`.

create extension if not exists pgcrypto;

-- Desired response type
create type response_type as enum (
  'empathy',          -- empathy / comfort
  'objective_advice',  -- objective advice
  'fact_check',        -- fact check
  'action_plan',       -- action plan
  'just_listen'        -- just listen
);

-- Contact profile
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text not null,        -- relationship (friend / family / coworker / senior-junior, etc.; free input)
  occupation text,                   -- occupation
  mbti text check (mbti ~ '^[EI][NS][TF][JP]$'),
  personality_tags text[] not null default '{}',  -- personality tags (e.g. ['empathetic','blunt'])
  memo text,                         -- other notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_user_id_idx on contacts(user_id);

-- Worry log
create table worries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  desired_response_type response_type not null,
  created_at timestamptz not null default now()
);

create index worries_user_id_idx on worries(user_id);

-- AI recommendation results (multiple contacts recommended per worry, ranked)
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  worry_id uuid not null references worries(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank int not null,                 -- 1st, 2nd, 3rd ...
  reason text not null,              -- reason for the recommendation
  script text not null,              -- "Try asking like this" conversation-starter script
  created_at timestamptz not null default now(),
  unique (worry_id, contact_id)
);

create index recommendations_worry_id_idx on recommendations(worry_id);
create index recommendations_user_id_idx on recommendations(user_id);

-- Stretch: role-play preview (simulates how that person might react)
create table roleplay_simulations (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  simulated_response text not null,
  created_at timestamptz not null default now()
);

create index roleplay_simulations_recommendation_id_idx on roleplay_simulations(recommendation_id);

-- Trigger to auto-update updated_at (contacts)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_set_updated_at
  before update on contacts
  for each row
  execute function set_updated_at();

-- Row Level Security: users can only read/modify their own data
alter table contacts enable row level security;
alter table worries enable row level security;
alter table recommendations enable row level security;
alter table roleplay_simulations enable row level security;

create policy "contacts_owner_all" on contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "worries_owner_all" on worries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recommendations_owner_all" on recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "roleplay_simulations_owner_all" on roleplay_simulations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
