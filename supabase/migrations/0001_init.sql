-- EchoTale 초기 스키마 + RLS
-- 적용:  supabase db push   (또는 Supabase 대시보드 SQL 에디터에 붙여넣기)

-- ───────────────────────── profiles ─────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text default 'student' check (role in ('student','teacher','parent')),
  plan text default 'classroom' check (plan in ('classroom','free','pro')),
  level text default 'A1',
  native_lang text default 'ko',
  xp int default 0,
  streak int default 0,
  last_active date,
  created_at timestamptz default now()
);

-- auth.users 생성 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── books & content ─────────────────────────
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ko text,
  level text not null,
  age_band text,
  cover_url text,
  summary_ko text,
  word_count int default 0,
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books on delete cascade,
  page_no int not null,
  spread text,
  image_url text
);
create index if not exists pages_book_idx on pages(book_id, page_no);

create table if not exists sentences (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages on delete cascade,
  ord int not null,
  text text not null,
  translation_ko text,
  audio_url text,
  word_timings jsonb default '[]'
);
create index if not exists sentences_page_idx on sentences(page_id, ord);

create table if not exists words ( -- 전역 사전 캐시
  text text primary key,
  lemma text,
  ipa text,
  pos text,
  meaning_ko text,
  example_en text,
  example_ko text,
  audio_url text,
  updated_at timestamptz default now()
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books on delete cascade,
  ord int,
  question_ko text,
  qtype text,
  options jsonb,
  answer_index int,
  explain_ko text
);
create index if not exists quizzes_book_idx on quizzes(book_id, ord);

-- ───────────────────────── learning records ─────────────────────────
create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  book_id uuid references books,
  mode text,
  minutes numeric default 0,
  pages_done int default 0,
  created_at timestamptz default now()
);
create index if not exists reading_sessions_user_idx on reading_sessions(user_id, created_at);

create table if not exists pronunciation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  sentence_id uuid references sentences,
  accuracy int, fluency int, completeness int, prosody int, overall int,
  word_scores jsonb,
  audio_url text,
  created_at timestamptz default now()
);
create index if not exists pron_user_idx on pronunciation_results(user_id, created_at);

create table if not exists wordbook ( -- SRS (SM-2)
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  word text references words(text),
  ef numeric default 2.5,
  interval_days int default 0,
  repetitions int default 0,
  due_date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, word)
);
create index if not exists wordbook_due_idx on wordbook(user_id, due_date);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  book_id uuid references books,
  score int, total int,
  created_at timestamptz default now()
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  code text,
  earned_at timestamptz default now(),
  unique(user_id, code)
);

-- ───────────────────────── classroom (교사 모드) ─────────────────────────
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles,
  name text,
  join_code text unique
);

create table if not exists enrollments (
  classroom_id uuid references classrooms on delete cascade,
  student_id uuid references profiles on delete cascade,
  primary key (classroom_id, student_id)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms,
  book_id uuid references books,
  due_date date,
  created_at timestamptz default now()
);

-- ═════════════════════════ RLS ═════════════════════════
alter table profiles enable row level security;
alter table reading_sessions enable row level security;
alter table pronunciation_results enable row level security;
alter table wordbook enable row level security;
alter table quiz_attempts enable row level security;
alter table badges enable row level security;
alter table books enable row level security;
alter table pages enable row level security;
alter table sentences enable row level security;
alter table words enable row level security;
alter table quizzes enable row level security;
alter table classrooms enable row level security;
alter table enrollments enable row level security;
alter table assignments enable row level security;

-- 본인 데이터만 (select/insert/update/delete)
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions" on reading_sessions;
create policy "own sessions" on reading_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own pron" on pronunciation_results;
create policy "own pron" on pronunciation_results for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own wordbook" on wordbook;
create policy "own wordbook" on wordbook for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attempts" on quiz_attempts;
create policy "own attempts" on quiz_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own badges" on badges;
create policy "own badges" on badges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 콘텐츠: published 는 누구나 읽기
drop policy if exists "read published books" on books;
create policy "read published books" on books for select using (published = true);

drop policy if exists "read pages" on pages;
create policy "read pages" on pages for select using (
  exists (select 1 from books b where b.id = pages.book_id and b.published)
);

drop policy if exists "read sentences" on sentences;
create policy "read sentences" on sentences for select using (
  exists (
    select 1 from pages p join books b on b.id = p.book_id
    where p.id = sentences.page_id and b.published
  )
);

drop policy if exists "read words" on words;
create policy "read words" on words for select using (true);

drop policy if exists "read quizzes" on quizzes;
create policy "read quizzes" on quizzes for select using (
  exists (select 1 from books b where b.id = quizzes.book_id and b.published)
);

-- classroom: 교사는 본인 교실, 학생은 등록된 교실
drop policy if exists "teacher classrooms" on classrooms;
create policy "teacher classrooms" on classrooms for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "student read classrooms" on classrooms;
create policy "student read classrooms" on classrooms for select using (
  exists (select 1 from enrollments e where e.classroom_id = classrooms.id and e.student_id = auth.uid())
);

drop policy if exists "enrollment access" on enrollments;
create policy "enrollment access" on enrollments for all using (
  auth.uid() = student_id
  or exists (select 1 from classrooms c where c.id = enrollments.classroom_id and c.teacher_id = auth.uid())
);

drop policy if exists "assignment read" on assignments;
create policy "assignment read" on assignments for select using (
  exists (select 1 from classrooms c where c.id = assignments.classroom_id and c.teacher_id = auth.uid())
  or exists (select 1 from enrollments e where e.classroom_id = assignments.classroom_id and e.student_id = auth.uid())
);

drop policy if exists "assignment write" on assignments;
create policy "assignment write" on assignments for all using (
  exists (select 1 from classrooms c where c.id = assignments.classroom_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classrooms c where c.id = assignments.classroom_id and c.teacher_id = auth.uid())
);
