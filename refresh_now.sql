-- Immediately refresh the expired token
-- This will call the Edge Function right now

-- 1. Check current status
SELECT 
  creator_unique_identifier,
  expires_at,
  updated_at,
  expires_at - NOW() as time_until_expiry,
  CASE 
    WHEN expires_at <= NOW() THEN 'Expired - Will be refreshed'
    ELSE 'Valid'
  END as current_status
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

-- 2. Trigger immediate refresh
SELECT refresh_expired_youtube_tokens() as tokens_refreshed;

-- 3. Wait a moment for the refresh to complete
SELECT pg_sleep(2);

-- 4. Check if token was refreshed
SELECT 
  creator_unique_identifier,
  expires_at,
  updated_at,
  expires_at - NOW() as new_time_until_expiry,
  CASE 
    WHEN expires_at > NOW() THEN '✅ Refreshed! Token is now valid'
    WHEN expires_at <= NOW() THEN '❌ Still expired - refresh may have failed'
    ELSE '⚠️ No expiration set'
  END as refresh_status,
  updated_at > '2026-02-01 12:10:58' as was_updated
FROM airpublisher_youtube_tokens
WHERE creator_unique_identifier = 'creator_735175e5_1768726539_f7262d3a';

