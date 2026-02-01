-- Test manual refresh to verify Edge Function is working
-- This will refresh the expired token immediately

-- 1. Check current token status
SELECT 
  creator_unique_identifier,
  expires_at,
  updated_at,
  expires_at - NOW() as time_until_expiry,
  CASE 
    WHEN expires_at <= NOW() THEN 'Expired'
    WHEN expires_at <= NOW() + INTERVAL '5 minutes' THEN 'Expiring soon'
    ELSE 'Valid'
  END as status
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

-- 2. Manually trigger refresh
SELECT refresh_expired_youtube_tokens();

-- 3. Check token status after refresh
SELECT 
  creator_unique_identifier,
  expires_at,
  updated_at,
  expires_at - NOW() as time_until_expiry,
  CASE 
    WHEN expires_at > NOW() THEN 'Valid (Refreshed!)'
    WHEN expires_at <= NOW() THEN 'Still Expired'
    ELSE 'No expiration set'
  END as status_after_refresh
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

-- 4. Check if updated_at changed (indicates refresh happened)
SELECT 
  creator_unique_identifier,
  updated_at,
  NOW() - updated_at as time_since_update
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

