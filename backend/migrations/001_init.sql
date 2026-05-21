create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists conversations (
  id bigserial primary key,
  role text check (role in ('user','assistant')),
  content text,
  mood text,
  created_at timestamptz default now()
);
create index if not exists idx_conv_created on conversations (created_at desc);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  tag text,
  embedding vector(1024),
  source_turn bigint references conversations(id),
  pinned boolean default false,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'idx_mem_vec'
  ) then
    begin
      create index idx_mem_vec on memories using ivfflat (embedding vector_cosine_ops);
    exception when others then
      -- ivfflat requires data; skip silently on empty table
    end;
  end if;
end$$;

create table if not exists push_log (
  id bigserial primary key,
  message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  opened boolean default false
);

create table if not exists mood_snapshots (
  id bigserial primary key,
  mood text,
  confidence real,
  trigger text,
  created_at timestamptz default now()
);
