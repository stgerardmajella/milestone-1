-- Milestone 1 database schema
-- Baseline migration for the existing remote Supabase project.

create extension if not exists pgcrypto;

-- Activities available to the prototype recommendation engine.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  location text not null,
  date date,
  start_time time,
  end_time time,
  image_url text,
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  source_name text,
  source_url text,
  created_at timestamptz not null default now()
);

-- Tags associated with activities.
create table public.activity_tags (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  tag text not null,
  unique(activity_id, tag)
);

-- Stores the interpreted search request.
create table public.search_sessions (
  id uuid primary key default gen_random_uuid(),
  original_query text not null,
  created_at timestamptz not null default now(),
  location text,
  budget numeric(10,2),
  date date,
  people integer check (people is null or people > 0),
  intent text
);

-- Stores ranked recommendations generated for a search session.
create table public.search_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.search_sessions(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  match_score numeric(5,2) not null,
  rank integer not null,
  why_selected text not null,
  created_at timestamptz not null default now(),
  unique(session_id, activity_id)
);

-- Indexes supporting common lookup and filtering operations.
create index idx_activities_location
  on public.activities(location);

create index idx_activities_category
  on public.activities(category);

create index idx_activities_date
  on public.activities(date);

create index idx_activity_tags_activity_id
  on public.activity_tags(activity_id);

create index idx_activity_tags_tag
  on public.activity_tags(tag);

create index idx_search_results_session_id
  on public.search_results(session_id);

create index idx_search_results_activity_id
  on public.search_results(activity_id);

-- Enable Row Level Security on all exposed tables.
alter table public.activities enable row level security;
alter table public.activity_tags enable row level security;
alter table public.search_sessions enable row level security;
alter table public.search_results enable row level security;

-- Public prototype data is readable by the anonymous browser client.
create policy "public can read activities"
on public.activities
for select
to anon
using (true);

create policy "public can read activity tags"
on public.activity_tags
for select
to anon
using (true);