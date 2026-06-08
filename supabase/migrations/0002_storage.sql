-- Storage 버킷 + 정책
-- book-images(공개), tts-audio(공개), user-recordings(비공개·본인)

insert into storage.buckets (id, name, public)
values ('book-images', 'book-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tts-audio', 'tts-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('user-recordings', 'user-recordings', false)
on conflict (id) do nothing;

-- 공개 버킷 읽기
drop policy if exists "public read book-images" on storage.objects;
create policy "public read book-images" on storage.objects for select
  using (bucket_id = 'book-images');

drop policy if exists "public read tts-audio" on storage.objects;
create policy "public read tts-audio" on storage.objects for select
  using (bucket_id = 'tts-audio');

-- user-recordings: 본인 폴더(userId/*)만 접근
drop policy if exists "own recordings read" on storage.objects;
create policy "own recordings read" on storage.objects for select
  using (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own recordings write" on storage.objects;
create policy "own recordings write" on storage.objects for insert
  with check (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own recordings delete" on storage.objects;
create policy "own recordings delete" on storage.objects for delete
  using (
    bucket_id = 'user-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
