-- Stories en direct (ADR-0016, revision) : photo ou video filmee depuis l'app (15 s max),
-- stockee dans un bucket dedie qui accepte la video.
alter table public.stories rename column photo_path to media_path;
alter table public.stories
  add column media_type text not null default 'photo' constraint stories_media_type check (media_type in ('photo', 'video')),
  add column duration_seconds integer constraint stories_duration check (duration_seconds is null or (duration_seconds between 1 and 30));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-media', 'story-media', true, 62914560,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "story_media_public_read" on storage.objects for select
  using (bucket_id = 'story-media');
