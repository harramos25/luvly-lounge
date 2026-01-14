-- Add DOB column if it doesn't exist
alter table profiles 
add column if not exists dob date;

-- Ensure gender_identity exists (it should, but just in case)
alter table profiles 
add column if not exists gender_identity text;

-- Allow users to update these columns (RLS is already set to 'users can update own profile', so this is implicit, but good to ensure)
