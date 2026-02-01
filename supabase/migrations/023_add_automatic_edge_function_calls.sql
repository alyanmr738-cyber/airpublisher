-- Migration: Update cron job functions to automatically call Edge Function
-- This makes token refresh truly automatic via pg_net extension

-- Enable pg_net extension (if available)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update YouTube token refresh function to call Edge Function
CREATE OR REPLACE FUNCTION refresh_expired_youtube_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_refreshed_count INTEGER := 0;
  v_supabase_url TEXT := 'https://pezvnqhexxttlhcnbtta.supabase.co';
  v_edge_function_url TEXT;
  v_request_id BIGINT;
  v_response RECORD;
  v_status_code INT;
  v_response_body TEXT;
BEGIN
  -- Find tokens that are expired or expiring within 5 minutes
  FOR v_token IN
    SELECT 
      creator_unique_identifier,
      google_refresh_token
    FROM airpublisher_youtube_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '5 minutes'))
      AND google_refresh_token IS NOT NULL
    LIMIT 10  -- Limit to 10 at a time to avoid overwhelming the API
  LOOP
    -- Build Edge Function URL
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    -- Call Edge Function via pg_net
    BEGIN
      -- Make HTTP POST request to Edge Function
      SELECT * INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'platform', 'youtube',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )
      );

      -- Wait a bit for the request to complete (pg_net is async)
      PERFORM pg_sleep(1);

      -- Check response status
      SELECT status_code, content INTO v_status_code, v_response_body
      FROM net.http_response
      WHERE request_id = v_request_id
      LIMIT 1;

      -- If successful (200-299), increment counter
      IF v_status_code >= 200 AND v_status_code < 300 THEN
        v_refreshed_count := v_refreshed_count + 1;
        RAISE NOTICE 'Successfully refreshed token for creator: %', v_token.creator_unique_identifier;
      ELSE
        RAISE WARNING 'Failed to refresh token for creator: %. Status: %, Response: %', 
          v_token.creator_unique_identifier, v_status_code, v_response_body;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- If pg_net call fails, log error but continue
      RAISE WARNING 'Error refreshing token for creator %: %', v_token.creator_unique_identifier, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processed % YouTube tokens, refreshed %', 
    (SELECT COUNT(*) FROM airpublisher_youtube_tokens 
     WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '5 minutes'))
       AND google_refresh_token IS NOT NULL), 
    v_refreshed_count;
  
  RETURN v_refreshed_count;
END;
$$;

-- Update Instagram token refresh function to call Edge Function
CREATE OR REPLACE FUNCTION refresh_expired_instagram_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_refreshed_count INTEGER := 0;
  v_supabase_url TEXT := 'https://pezvnqhexxttlhcnbtta.supabase.co';
  v_edge_function_url TEXT;
  v_request_id BIGINT;
  v_status_code INT;
  v_response_body TEXT;
BEGIN
  -- Find tokens that are expired or expiring within 7 days
  FOR v_token IN
    SELECT 
      creator_unique_identifier
    FROM airpublisher_instagram_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '7 days'))
      AND (facebook_access_token IS NOT NULL OR instagram_access_token IS NOT NULL)
    LIMIT 10  -- Limit to 10 at a time
  LOOP
    -- Build Edge Function URL
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    -- Call Edge Function via pg_net
    BEGIN
      -- Make HTTP POST request to Edge Function
      SELECT * INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'platform', 'instagram',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )
      );

      -- Wait a bit for the request to complete
      PERFORM pg_sleep(1);

      -- Check response status
      SELECT status_code, content INTO v_status_code, v_response_body
      FROM net.http_response
      WHERE request_id = v_request_id
      LIMIT 1;

      -- If successful, increment counter
      IF v_status_code >= 200 AND v_status_code < 300 THEN
        v_refreshed_count := v_refreshed_count + 1;
        RAISE NOTICE 'Successfully refreshed Instagram token for creator: %', v_token.creator_unique_identifier;
      ELSE
        RAISE WARNING 'Failed to refresh Instagram token for creator: %. Status: %', 
          v_token.creator_unique_identifier, v_status_code;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error refreshing Instagram token for creator %: %', v_token.creator_unique_identifier, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processed Instagram tokens, refreshed %', v_refreshed_count;
  
  RETURN v_refreshed_count;
END;
$$;

-- Add TikTok token refresh function
CREATE OR REPLACE FUNCTION refresh_expired_tiktok_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_refreshed_count INTEGER := 0;
  v_supabase_url TEXT := 'https://pezvnqhexxttlhcnbtta.supabase.co';
  v_edge_function_url TEXT;
  v_request_id BIGINT;
  v_status_code INT;
  v_response_body TEXT;
BEGIN
  -- Find tokens that are expired or expiring within 1 day
  FOR v_token IN
    SELECT 
      creator_unique_identifier
    FROM airpublisher_tiktok_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '1 day'))
      AND tiktok_access_token IS NOT NULL
      AND tiktok_refresh_token IS NOT NULL
    LIMIT 10  -- Limit to 10 at a time
  LOOP
    -- Build Edge Function URL
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    -- Call Edge Function via pg_net
    BEGIN
      -- Make HTTP POST request to Edge Function
      SELECT * INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'platform', 'tiktok',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )
      );

      -- Wait a bit for the request to complete
      PERFORM pg_sleep(1);

      -- Check response status
      SELECT status_code, content INTO v_status_code, v_response_body
      FROM net.http_response
      WHERE request_id = v_request_id
      LIMIT 1;

      -- If successful, increment counter
      IF v_status_code >= 200 AND v_status_code < 300 THEN
        v_refreshed_count := v_refreshed_count + 1;
        RAISE NOTICE 'Successfully refreshed TikTok token for creator: %', v_token.creator_unique_identifier;
      ELSE
        RAISE WARNING 'Failed to refresh TikTok token for creator: %. Status: %', 
          v_token.creator_unique_identifier, v_status_code;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error refreshing TikTok token for creator %: %', v_token.creator_unique_identifier, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processed TikTok tokens, refreshed %', v_refreshed_count;
  
  RETURN v_refreshed_count;
END;
$$;

-- Schedule TikTok refresh job (every 12 hours, since TikTok tokens last longer)
SELECT cron.schedule(
  'refresh-expired-tiktok-tokens',
  '0 */12 * * *', -- Every 12 hours
  $$
  SELECT refresh_expired_tiktok_tokens();
  $$
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_expired_youtube_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_expired_youtube_tokens() TO anon;
GRANT EXECUTE ON FUNCTION refresh_expired_instagram_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_expired_instagram_tokens() TO anon;
GRANT EXECUTE ON FUNCTION refresh_expired_tiktok_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_expired_tiktok_tokens() TO anon;

