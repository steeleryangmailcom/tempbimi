-- ============================================================
-- Coupled App - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- One row per user; extends the built-in auth.users table

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  partner_id  uuid references public.profiles(id) on delete set null,
  invite_code text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes
create index profiles_partner_id_idx on public.profiles(partner_id);
create index profiles_invite_code_idx on public.profiles(invite_code);

-- ─── Preferences ─────────────────────────────────────────────────────────────

create table public.preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null,
  value      text not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)          -- one entry per category per user
);

create index preferences_user_id_idx on public.preferences(user_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Users can only read/write their own data, EXCEPT they can read their
-- partner's preferences and profile (enforced via the partner_id join).

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;

-- Profiles: users manage their own row
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can view partner profile"
  on public.profiles for select
  using (
    auth.uid() in (
      select partner_id from public.profiles where id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Preferences: users manage their own; partners can read
create policy "Users can manage own preferences"
  on public.preferences for all
  using (auth.uid() = user_id);

create policy "Partners can read preferences"
  on public.preferences for select
  using (
    user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Auto-create profile on signup ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
