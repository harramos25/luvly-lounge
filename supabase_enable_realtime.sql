-- Enable Realtime for specific tables
-- This is often required for the client to receive 'postgres_changes' events.

begin;
  -- 1. Enable replication for profiles (for status updates)
  alter publication supabase_realtime add table profiles;
  
  -- 2. Enable replication for conversation_participants (for new match detection)
  alter publication supabase_realtime add table conversation_participants;
  
  -- 3. Enable replication for direct_messages (for chat)
  alter publication supabase_realtime add table direct_messages;
commit;
