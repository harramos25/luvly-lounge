-- ==============================================================================
-- FIX STORAGE BUCKETS & POLICIES
-- Run this in Supabase SQL Editor to Ensure Uploads Work
-- ==============================================================================

-- 1. Create 'verifications' bucket if not exists
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', true)
on conflict (id) do nothing;

-- 2. Create 'avatars' bucket if not exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ==============================================================================
-- RLS POLICIES FOR STORAGE
-- ==============================================================================

-- Allow Authenticated Users to Upload Verification Photos
create policy "Allow Authenticated Uploads to Verifications"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'verifications' );

-- Allow Authenticated Users to View Verification Photos (or restricted to admin?)
-- For now, allow view so the user can see their own upload if needed, but optimally restricted.
create policy "Allow Public Read to Verifications"
on storage.objects for select
to public
using ( bucket_id = 'verifications' );


-- Allow Authenticated Users to Upload Avatars
create policy "Allow Authenticated Uploads to Avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- Allow Public Read to Avatars
create policy "Allow Public Read to Avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );
