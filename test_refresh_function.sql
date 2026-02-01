-- Test the database function that calls the Edge Function
-- This is SQL, not the Edge Function code itself

-- 1. Test if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'refresh_expired_youtube_tokens';

-- 2. Run the refresh function (this will call the Edge Function via pg_net)
SELECT refresh_expired_youtube_tokens();

-- 3. Check if tokens were updated
SELECT 
  creator_unique_identifier,
  expires_at,
  updated_at,
  expires_at - NOW() as time_until_expiry
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

-- Note: The Edge Function itself is TypeScript and is deployed separately
-- This SQL function just calls it via HTTP using pg_net

