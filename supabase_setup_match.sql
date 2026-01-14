-- ==========================================
-- 3. MATCHMAKING ALGORITHM (RPC)
-- ==========================================

create or replace function search_for_match(my_id uuid, my_interests text[])
returns table (
  partner_id uuid,
  partner_name text,
  partner_avatar text,
  shared_interest text
) as $$
declare
  match_record record;
begin
  -- Find a user who is 'searching', not me, and shares at least one interest.
  -- Prioritize users who are NOT in an active conversation with me (optional but good).
  select 
    p.id, 
    p.full_name, 
    p.avatar_url,
    (select x from unnest(p.interests) as x where x = any(my_interests) limit 1) as common_interest
  into match_record
  from profiles p
  where p.id != my_id
    and p.status = 'searching'
    and p.interests && my_interests -- Array overlap operator
  limit 1;

  if match_record.id is not null then
    -- Return the match
    return query select 
      match_record.id, 
      match_record.full_name, 
      match_record.avatar_url, 
      match_record.common_interest;
      
   end if;

end;
$$ language plpgsql;


-- ==========================================
-- 4. CONVERSATION HELPER
-- ==========================================

create or replace function find_conversation_with_user(other_user_id uuid)
returns uuid as $$
  select c.id
  from conversations c
  join conversation_participants cp1 on cp1.conversation_id = c.id
  join conversation_participants cp2 on cp2.conversation_id = c.id
  where cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
  limit 1;
$$ language sql;
