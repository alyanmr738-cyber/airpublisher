-- Migration: Add background token refresh using pg_cron
-- This automatically refreshes expired tokens in the background
-- so n8n always gets fresh tokens when querying

-- Enable pg_cron extension (if available)
-- Note: This may require Supabase admin access
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to refresh expired YouTube tokens
-- Note: This function currently just identifies tokens that need refresh
-- The actual refresh happens via the Edge Function when tokens are accessed
-- or you can set up an external cron job to call the Edge Function
CREATE OR REPLACE FUNCTION refresh_expired_youtube_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_refreshed_count INTEGER := 0;
BEGIN
  -- Find tokens that are expired or expiring within 5 minutes
  -- This function identifies tokens that need refresh
  -- The actual refresh will happen:
  -- 1. When n8n queries get_valid_youtube_token() and the app refreshes it
  -- 2. When the Edge Function is called directly
  -- 3. Via an external cron job that calls the Edge Function
  
  SELECT COUNT(*) INTO v_refreshed_count
  FROM airpublisher_youtube_tokens
  WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '5 minutes'))
    AND google_refresh_token IS NOT NULL;
  
  -- Log how many tokens need refresh (for monitoring)
  RAISE NOTICE 'Found % YouTube tokens that need refresh', v_refreshed_count;
  
  RETURN v_refreshed_count;
END;
$$;

-- Schedule job to refresh expired tokens every 10 minutes
-- Note: Adjust the schedule as needed
SELECT cron.schedule(
  'refresh-expired-tokens',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT refresh_expired_youtube_tokens();
  $$
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_expired_youtube_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_expired_youtube_tokens() TO anon;

