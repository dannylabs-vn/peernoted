-- =====================================================================
-- PeerNoted Supabase schema — run this in the Supabase SQL editor
-- (Project → SQL → New query → paste → Run)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- folders ----------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  chapter text not null default '',
  grade text not null default '',
  cheat_sheet_markdown text not null default '',
  cheat_sheet_json jsonb,
  cheat_sheet_version int not null default 1,
  selected_template text not null default 'academic-blue',
  handwriting_font text not null default '',
  handwriting_sample_url text not null default '',
  podcast_audio_url text not null default '',
  podcast_script jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_updated_at_idx on public.folders (updated_at desc);

-- ---------- files ----------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  original_name text not null,
  storage_url text not null default '',
  file_type text not null,
  file_size bigint not null default 0,
  extracted_text text not null default '',
  ai_summary text not null default '',
  ai_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_folder_id_idx on public.files (folder_id);
create index if not exists files_created_at_idx on public.files (created_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists folders_touch on public.folders;
create trigger folders_touch
  before update on public.folders
  for each row execute function public.touch_updated_at();

drop trigger if exists files_touch on public.files;
create trigger files_touch
  before update on public.files
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
-- Single-user app for now: keep RLS DISABLED so the anon key from the server
-- can read/write directly. If multi-user is added later, enable RLS and add
-- policies keyed off auth.uid().
alter table public.folders disable row level security;
alter table public.files   disable row level security;
