-- Nandzz MVP Schema
-- Safe to re-run — all statements are idempotent

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  tagline text,
  bio text,
  avatar_url text,
  website_url text,
  social_links jsonb default '{}',
  created_at timestamptz default now()
);

-- 2. Create spaces table
create table if not exists public.spaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null default 'url' check (type in ('url', 'html')),
  url text,
  html_url text,
  preview_image_url text,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;

-- 4. Profiles policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Spaces policies
drop policy if exists "Public spaces are viewable by everyone" on public.spaces;
create policy "Public spaces are viewable by everyone"
  on public.spaces for select
  using (is_public = true);

drop policy if exists "Users can view their own spaces" on public.spaces;
create policy "Users can view their own spaces"
  on public.spaces for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own spaces" on public.spaces;
create policy "Users can insert their own spaces"
  on public.spaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own spaces" on public.spaces;
create policy "Users can update their own spaces"
  on public.spaces for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  using (auth.uid() = user_id);

-- 6. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('space-previews', 'space-previews', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('space-html', 'space-html', true) on conflict (id) do nothing;

-- Storage policies for avatars
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for space previews
drop policy if exists "Space preview images are publicly accessible" on storage.objects;
create policy "Space preview images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'space-previews');

drop policy if exists "Users can upload space previews" on storage.objects;
create policy "Users can upload space previews"
  on storage.objects for insert
  with check (bucket_id = 'space-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update space previews" on storage.objects;
create policy "Users can update space previews"
  on storage.objects for update
  using (bucket_id = 'space-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete space previews" on storage.objects;
create policy "Users can delete space previews"
  on storage.objects for delete
  using (bucket_id = 'space-previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for space HTML files
drop policy if exists "Space HTML files are publicly accessible" on storage.objects;
create policy "Space HTML files are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'space-html');

drop policy if exists "Users can upload space HTML" on storage.objects;
create policy "Users can upload space HTML"
  on storage.objects for insert
  with check (bucket_id = 'space-html' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update space HTML" on storage.objects;
create policy "Users can update space HTML"
  on storage.objects for update
  using (bucket_id = 'space-html' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete space HTML" on storage.objects;
create policy "Users can delete space HTML"
  on storage.objects for delete
  using (bucket_id = 'space-html' and (storage.foldername(name))[1] = auth.uid()::text);

-- 8. Social links column (for existing databases)
alter table public.profiles add column if not exists social_links jsonb default '{}';

-- 9. Likes system

-- Add likes count to spaces
alter table public.spaces add column if not exists likes_count integer default 0;

-- Create likes table
create table if not exists public.space_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  space_id uuid references public.spaces(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, space_id)
);

alter table public.space_likes enable row level security;

-- RLS: Anyone can view likes
drop policy if exists "Likes are viewable by everyone" on public.space_likes;
create policy "Likes are viewable by everyone"
  on public.space_likes for select using (true);

-- RLS: Authenticated users can like
drop policy if exists "Users can like spaces" on public.space_likes;
create policy "Users can like spaces"
  on public.space_likes for insert with check (auth.uid() = user_id);

-- RLS: Users can unlike their own
drop policy if exists "Users can unlike spaces" on public.space_likes;
create policy "Users can unlike spaces"
  on public.space_likes for delete using (auth.uid() = user_id);

-- Function to update likes_count
create or replace function public.update_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.spaces set likes_count = likes_count + 1 where id = NEW.space_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.spaces set likes_count = likes_count - 1 where id = OLD.space_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_change on public.space_likes;
create trigger on_like_change
  after insert or delete on public.space_likes
  for each row execute procedure public.update_likes_count();
