-- ==========================================
-- FIX ACCOUNT DELETION (Cascading Deletes)
-- ==========================================

-- 1. Helper function to clean up user data (messages, requests, etc.)
-- This handles the foreign key constraints manually.
create or replace function clean_user_data(target_id uuid)
returns void
security definer
as $$
begin
  -- Delete Friend Requests
  delete from friend_requests where sender_id = target_id or receiver_id = target_id;
  
  -- Delete Direct Messages
  delete from direct_messages where sender_id = target_id;
  
  -- Attempt to delete from 'messages' if it exists (legacy/other table)
  begin
    execute 'delete from messages where user_id = ' || quote_literal(target_id);
  exception when others then
    null; -- Ignore if table missing
  end;

  -- Delete Conversation Participants
  delete from conversation_participants where user_id = target_id;

  -- Delete Profile (this might cascade to others, but we do it explicitly)
  delete from profiles where id = target_id;
end;
$$ language plpgsql;

-- 2. The main function called by the client-side (RPC)
-- This replaces the old function that was failing.
create or replace function delete_user_account()
returns void
security definer
as $$
begin
  -- 1. Clean data
  perform clean_user_data(auth.uid());
  
  -- 2. Delete Auth User
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql;
