-- =====================================================================
-- PeerNoted Supabase schema -- run this in the Supabase SQL editor
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- users ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  school text not null default '',
  cohort text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_email_idx on public.users (email);

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

-- =====================================================================
-- MULTIPLAYER TABLES
-- =====================================================================

-- ---------- rooms ----------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  topic text not null default '',
  is_public boolean not null default true,
  invite_code text not null unique,
  owner_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_owner_idx on public.rooms (owner_id);
create index if not exists rooms_invite_code_idx on public.rooms (invite_code);

-- ---------- room_members ----------
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  role_suggestion jsonb,
  joined_at timestamptz not null default now(),
  peer_points int not null default 0,
  unique(room_id, user_id)
);
create index if not exists room_members_room_idx on public.room_members (room_id);
create index if not exists room_members_user_idx on public.room_members (user_id);

-- ---------- room_channels ----------
create table if not exists public.room_channels (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique(room_id, name)
);
create index if not exists room_channels_room_idx on public.room_channels (room_id);

-- ---------- room_files ----------
create table if not exists public.room_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  channel_id uuid references public.room_channels(id),
  uploaded_by uuid not null references public.users(id),
  original_name text not null,
  storage_url text not null default '',
  file_type text not null,
  file_size bigint not null default 0,
  extracted_text text not null default '',
  source_type text not null default 'upload' check (source_type in ('upload','library')),
  source_file_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists room_files_room_idx on public.room_files (room_id);

-- ---------- room_messages (lưu tin nhắn chat phòng học — bền vững) ----------
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  channel_id uuid not null references public.room_channels(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  type text not null default 'text',
  created_at timestamptz not null default now()
);
create index if not exists room_messages_channel_idx on public.room_messages (channel_id, created_at);
create index if not exists room_messages_room_idx on public.room_messages (room_id);

-- ---------- forum_posts (tài liệu chia sẻ ở diễn đàn — bền vững) ----------
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Tài liệu',
  school text not null default '',
  file_url text not null default '',
  file_name text not null default '',
  file_type text not null default '',
  file_size bigint not null default 0,
  downloads int not null default 0,
  likes int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists forum_posts_created_idx on public.forum_posts (created_at desc);

-- ---------- peer_rewards ----------
create table if not exists public.peer_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cost int not null,
  image_url text not null default '',
  reward_type text not null default 'avatar' check (reward_type in ('avatar','role','badge','other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- user_unlocked_rewards ----------
create table if not exists public.user_unlocked_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id uuid not null references public.peer_rewards(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(user_id, reward_id)
);

-- ---------- seed rewards ----------
insert into public.peer_rewards (name, description, cost, reward_type) values
  ('Scholar Avatar', 'Mo khoa avatar hoc gia', 100, 'avatar'),
  ('Ninja Avatar', 'Mo khoa avatar ninja', 200, 'avatar'),
  ('Legend Badge', 'Huy hieu huyen thoai', 500, 'badge'),
  ('VIP Role', 'Role dac biet trong room', 1000, 'role')
on conflict do nothing;

-- =====================================================================
-- QUIZ & SPACED REPETITION TABLES
-- =====================================================================

-- ---------- quiz_attempts ----------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  folder_id uuid not null references public.folders(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  user_answer text not null,
  is_correct boolean not null,
  topic_tag text not null default '',
  explanation text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id);
create index if not exists quiz_attempts_folder_idx on public.quiz_attempts (folder_id);

-- ---------- spaced_repetition_items ----------
create table if not exists public.spaced_repetition_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quiz_attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  next_review_at timestamptz not null,
  interval_hours int not null default 24,
  status text not null default 'pending' check (status in ('pending', 'mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sr_items_user_idx on public.spaced_repetition_items (user_id);
create index if not exists sr_items_next_review_idx on public.spaced_repetition_items (next_review_at);
-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch on public.users;
create trigger users_touch
  before update on public.users
  for each row execute function public.touch_updated_at();

drop trigger if exists folders_touch on public.folders;
create trigger folders_touch
  before update on public.folders
  for each row execute function public.touch_updated_at();

drop trigger if exists files_touch on public.files;
create trigger files_touch
  before update on public.files
  for each row execute function public.touch_updated_at();

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch
  before update on public.rooms
  for each row execute function public.touch_updated_at();

drop trigger if exists sr_items_touch on public.spaced_repetition_items;
create trigger sr_items_touch
  before update on public.spaced_repetition_items
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.users   disable row level security;
alter table public.folders disable row level security;
alter table public.files   disable row level security;
alter table public.rooms   disable row level security;
alter table public.room_members disable row level security;
alter table public.room_channels disable row level security;
alter table public.room_files disable row level security;
alter table public.room_messages disable row level security;
alter table public.forum_posts disable row level security;
alter table public.peer_rewards disable row level security;
alter table public.user_unlocked_rewards disable row level security;
alter table public.quiz_attempts disable row level security;
alter table public.spaced_repetition_items disable row level security;

