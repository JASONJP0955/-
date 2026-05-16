create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  japanese_level text default 'intermediate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  assistant_starter text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.utterances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  speaker text not null check (speaker in ('assistant', 'user')),
  text text not null,
  audio_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  utterance_id uuid not null unique references public.utterances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript_ja text not null,
  natural_expression_ja text not null,
  error_feedback jsonb not null default '[]'::jsonb,
  grammar_feedback jsonb not null default '[]'::jsonb,
  pronunciation_feedback jsonb not null default '[]'::jsonb,
  grammar_score integer not null check (grammar_score between 0 and 100),
  pronunciation_score integer not null check (pronunciation_score between 0 and 100),
  fluency_score integer not null check (fluency_score between 0 and 100),
  topic_state text,
  next_topic_suggestion_zh text,
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists error_feedback jsonb not null default '[]'::jsonb;

create index if not exists conversation_sessions_user_started_idx
  on public.conversation_sessions(user_id, started_at desc);

create index if not exists utterances_session_created_idx
  on public.utterances(session_id, created_at);

create index if not exists feedback_user_created_idx
  on public.feedback(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.conversation_sessions enable row level security;
alter table public.utterances enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Users can read their sessions" on public.conversation_sessions;
drop policy if exists "Users can create their sessions" on public.conversation_sessions;
drop policy if exists "Users can update their sessions" on public.conversation_sessions;
drop policy if exists "Users can read their utterances" on public.utterances;
drop policy if exists "Users can create their utterances" on public.utterances;
drop policy if exists "Users can read their feedback" on public.feedback;
drop policy if exists "Users can create their feedback" on public.feedback;

create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read their sessions"
  on public.conversation_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create their sessions"
  on public.conversation_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their sessions"
  on public.conversation_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their utterances"
  on public.utterances for select
  using (auth.uid() = user_id);

create policy "Users can create their utterances"
  on public.utterances for insert
  with check (auth.uid() = user_id);

create policy "Users can read their feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Users can create their feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-recordings', 'user-recordings', false, 52428800, array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

drop policy if exists "Users can upload their recordings" on storage.objects;
drop policy if exists "Users can read their recordings" on storage.objects;
drop policy if exists "Users can delete their recordings" on storage.objects;

create policy "Users can upload their recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their recordings"
  on storage.objects for select
  using (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their recordings"
  on storage.objects for delete
  using (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
