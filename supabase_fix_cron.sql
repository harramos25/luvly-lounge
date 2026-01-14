-- ==========================================
-- 2. FIX CRON JOB (Lowercase Tier)
-- ==========================================

create or replace function delete_old_free_messages()
returns void as $$
begin
  delete from direct_messages
  where created_at < now() - interval '24 hours'
  and sender_id in (
    -- FIX: Use lowercase 'free' to match enum
    select id from profiles where tier = 'free'::user_tier
  );
end;
$$ language plpgsql;

-- Re-schedule just in case
select cron.schedule(
  'cleanup-free-messages',
  '0 * * * *',
  $$select delete_old_free_messages()$$
);
