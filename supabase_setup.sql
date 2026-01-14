-- ==========================================
-- 1. FRIEND REQUESTS SETUP
-- ==========================================

-- Create Friend Requests Table
create table if not exists friend_requests (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  status text default 'pending', -- 'pending', 'accepted'
  created_at timestamp with time zone default now(),
  unique(sender_id, receiver_id)
);

-- Enable RLS
alter table friend_requests enable row level security;

-- Policies
create policy "Users can see their own requests"
on friend_requests for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send requests"
on friend_requests for insert
with check (auth.uid() = sender_id);

create policy "Users can update requests (Accept)"
on friend_requests for update
using (auth.uid() = receiver_id);


-- ==========================================
-- 2. AUTO-DELETE OLD MESSAGES (CRON JOB)
-- ==========================================

-- Create function to delete old messages for FREE users
create or replace function delete_old_free_messages()
returns void as $$
begin
  delete from direct_messages
  where created_at < now() - interval '24 hours'
  and sender_id in (
    select id from profiles where tier = 'FREE'
  );
end;
$$ language plpgsql;

-- Enable pg_cron (if available on your tier)
create extension if not exists pg_cron;

-- Schedule it to run every hour
-- (Note: this might fail on Free tier Supabase projects if pg_cron isn't included, 
-- but the client-side code will still hide them!)
select cron.schedule(
  'cleanup-free-messages',
  '0 * * * *',
  $$select delete_old_free_messages()$$
);
