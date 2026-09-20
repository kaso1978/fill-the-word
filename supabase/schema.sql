-- Fill the Word — Friends feature schema.
--
-- Run this once in the Supabase project's SQL Editor (Database -> SQL
-- Editor -> New query). This file is a checked-in record of what's running
-- there — editing it doesn't change the live database; re-run the relevant
-- statements against the project if the schema needs to change.
--
-- Two tables plus one RPC function. The function exists so redeeming a
-- friend code never needs broad read access to other users' rows: it looks
-- up exactly one profile by its code, inserts the friendship, and returns
-- only that one match — a client can never enumerate other users through it.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  friend_code text unique not null,
  verses_memorized int not null default 0,
  accuracy int not null default 0,
  -- Per-verse mastery and earned badge tiers, each packed as a compact
  -- "key=value;key=value" string (not jsonb) — see CLAUDE.md's Friends
  -- bullet for why: it's smaller than JSON's per-key quoting/colons, and
  -- simple enough to encode/decode client-side without a real engineering
  -- risk. `mastered` reuses the exact same "Book Chapter:Verse"=level keys
  -- as the local save data; `badges` only lists earned badges (tier > -1),
  -- unlisted ones default to unearned on decode.
  mastered text not null default '',
  badges text not null default '',
  updated_at timestamptz not null default now()
);

create table friendships (
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b)
);

-- Row Level Security: you can read/update only your own profile, plus read
-- a profile that's on the other end of a friendship row you're part of.
-- With RLS on, a plain `select * from profiles` from the client already
-- comes back scoped to just "me + my friends" — no explicit friend-list
-- filtering needed in application code.
alter table profiles enable row level security;
alter table friendships enable row level security;

create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "friend profiles" on profiles for select using (
  exists (select 1 from friendships
          where (user_a = auth.uid() and user_b = id)
             or (user_b = auth.uid() and user_a = id))
);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "read own friendships" on friendships for select using (
  auth.uid() = user_a or auth.uid() = user_b
);

-- least()/greatest() on the two UUIDs gives a canonical, order-independent
-- pair, so a friendship is one row regardless of who redeemed whose code,
-- and (user_a, user_b) as the primary key makes re-redeeming a no-op
-- (ON CONFLICT DO NOTHING) rather than an error.
create function redeem_friend_code(code text)
returns table (id uuid, display_name text, verses_memorized int, accuracy int)
language plpgsql security definer as $$
declare target uuid;
begin
  select p.id into target from profiles p where p.friend_code = code;
  if target is null or target = auth.uid() then
    return;
  end if;
  insert into friendships (user_a, user_b)
    values (least(auth.uid(), target), greatest(auth.uid(), target))
    on conflict do nothing;
  return query select p.id, p.display_name, p.verses_memorized, p.accuracy
    from profiles p where p.id = target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Feedback: the in-app "Feedback" tab. No sign-in required to submit —
-- anyone can insert a row. Reading and deleting are restricted to one
-- verified admin account via auth.jwt() ->> 'email' — this is checked
-- against the JWT's own verified email claim from a real Supabase Auth
-- session (the same sign-in Friends already uses), not anything the client
-- can set itself, so it can't be spoofed. Someone who finds the app's
-- hidden admin screen and signs in with a different email just gets an
-- empty list back.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  email text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;
create policy "anyone can submit feedback" on feedback for insert with check (true);
create policy "admin can read feedback" on feedback for select using (
  auth.jwt() ->> 'email' = 'ajjamoore@gmail.com'
);
create policy "admin can delete feedback" on feedback for delete using (
  auth.jwt() ->> 'email' = 'ajjamoore@gmail.com'
);
