-- =====================================================================
-- Migration: thêm màu / gắn sao / thứ tự cho thư mục (folders)
-- Chạy trong Supabase SQL editor (an toàn, chạy nhiều lần cũng được).
-- =====================================================================

alter table public.folders add column if not exists color text not null default '';
alter table public.folders add column if not exists is_starred boolean not null default false;
alter table public.folders add column if not exists position int not null default 0;

create index if not exists folders_position_idx on public.folders (position);
