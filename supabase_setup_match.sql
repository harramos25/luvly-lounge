-- ==========================================
-- 3. MATCHMAKING ALGORITHM (RPC)
-- ==========================================

-- DROP first to ensure we update the security setting
drop function if exists search_for_match;

create or replace function search_for_match(my_id uuid, my_interests text[])
returns table (
  partner_id uuid,
  partner_name text,
  partner_avatar text,
  shared_interest text
) 
security definer -- 🔴 FIX: Bypass RLS so we can see other users who are searching
as $$
declare
  match_record record;
  updated_rows int;
begin
  -- 1. Try to find a match and LOCK the row (SKIP LOCKED) to prevent race conditions
  -- We select a user who is 'searching', shares interest, is NOT me.
  
  -- ATTEMPT 1: Interest Match
  select 
    p.id, 
    p.full_name, 
    p.avatar_url,
    (select x from unnest(p.interests) as x where x = any(my_interests) limit 1) as common_interest
  into match_record
  from profiles p
  where p.id != my_id
    and p.status = 'searching'
    and p.interests && my_interests
  limit 1
  for update skip locked; -- KEY CHANGE: Lock the candidate row

  -- ATTEMPT 2: Random Match (if no interest match)
  if match_record.id is null then
    select 
      p.id, 
      p.full_name, 
      p.avatar_url,
      'Random Match'::text as common_interest
    into match_record
    from profiles p
    where p.id != my_id
      and p.status = 'searching'
    order by random()
    limit 1
    for update skip locked; -- KEY CHANGE: Lock the candidate row
  end if;

  -- IF MATCH FOUND
  if match_record.id is not null then
    
    -- UPDATE PARTNER to 'busy' immediately
    update profiles set status = 'busy' where id = match_record.id;
    
    -- UPDATE ME to 'busy' immediately as well
    update profiles set status = 'busy' where id = my_id;

    return query select 
      match_record.id, 
      match_record.full_name, 
      match_record.avatar_url, 
      'Interest: ' || match_record.common_interest;
      
  end if;

end;
$$ language plpgsql;


-- ==========================================
-- 4. CONVERSATION HELPER
-- ==========================================

create or replace function find_conversation_with_user(other_user_id uuid)
returns uuid 
security definer -- 🔴 FIX: Ensure we can read conversation participants freely
as $$
  select c.id
  from conversations c
  join conversation_participants cp1 on cp1.conversation_id = c.id
  join conversation_participants cp2 on cp2.conversation_id = c.id
  where cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
  limit 1;
$$ language sql;
