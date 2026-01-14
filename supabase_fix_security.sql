-- ==========================================
-- 5. FIX PROFILES & RLS (Security & Tier Defaults)
-- ==========================================

-- 1. Ensure Tier Defaults to 'free' (lowercase)
-- Note: It seems your database uses an ENUM type 'user_tier' which expects lowercase 'free'.
alter table profiles 
alter column tier set default 'free'::user_tier;

-- 2. Allow Users to Upload Verification & Update Profile
-- First, drop existing policies to be safe (avoid duplicates)
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

-- Re-create Policies
create policy "Users can view own profile"
on profiles for select
using ( auth.uid() = id );

create policy "Users can update own profile"
on profiles for update
using ( auth.uid() = id );

create policy "Users can insert own profile"
on profiles for insert
with check ( auth.uid() = id );

-- 3. Fix Storage Permissions for 'verifications' bucket
insert into storage.buckets (id, name, public) 
values ('verifications', 'verifications', true)
on conflict (id) do nothing;

create policy "Users can upload verification photos"
on storage.objects for insert
with check ( bucket_id = 'verifications' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can view verification photos (own only)"
on storage.objects for select
using ( bucket_id = 'verifications' and auth.uid()::text = (storage.foldername(name))[1] );

-- 4. Fix "Zombie" Profiles
-- Convert any 'PRO' or 'FREE' (uppercase) to 'free' (lowercase) if possible, 
-- but since it's an enum, we might need to be careful. 
-- If the column is already an Enum, it wont hold "FREE" anyway unless it was text before.
-- We will just try to set nulls to 'free'.
update profiles 
set tier = 'free'::user_tier
where tier is null; 
