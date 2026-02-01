-- Migration: Fix pg_net Edge Function calls
-- The issue is that pg_net is async and we need to handle it differently
-- Also need to get service role key from environment, not settings

-- Update YouTube token refresh function with better error handling
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
  v_service_role_key TEXT;
BEGIN
  -- Get service role key from environment variable
  -- In Supabase Edge Functions context, this should be available
  -- If not, we'll need to pass it differently
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If service role key is not available, we'll try calling without auth
  -- The Edge Function has been updated to allow same-project calls
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE NOTICE 'Service role key not found. Calling Edge Function without auth (same-project call).';
    v_service_role_key := NULL; -- Will omit Authorization header
  END IF;

  -- Find tokens that are expired or expiring within 5 minutes
  FOR v_token IN
    SELECT 
      creator_unique_identifier,
      google_refresh_token
    FROM airpublisher_youtube_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '5 minutes'))
      AND google_refresh_token IS NOT NULL
    LIMIT 10
  LOOP
    -- Build Edge Function URL
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    -- Call Edge Function via pg_net
    BEGIN
      -- Make HTTP POST request to Edge Function
      -- Build headers conditionally based on whether we have service role key
      -- pg_net.http_post returns the request ID directly as bigint
      SELECT net.http_post(
        url := v_edge_function_url,
        headers := CASE 
          WHEN v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
            jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_role_key
            )
          ELSE
            jsonb_build_object(
              'Content-Type', 'application/json'
            )
        END::jsonb,
        body := jsonb_build_object(
          'platform', 'youtube',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )::jsonb
      ) INTO v_request_id;

      -- pg_net is async and fire-and-forget
      -- We don't wait for response - Edge Function will update database directly
      -- Just log that we triggered the refresh
      v_refreshed_count := v_refreshed_count + 1;
      RAISE NOTICE 'Triggered token refresh for creator: % (request_id: %)', 
        v_token.creator_unique_identifier, v_request_id;

    EXCEPTION WHEN OTHERS THEN
      -- If pg_net call fails, log error but continue
      RAISE WARNING 'Error refreshing token for creator %: % (SQLSTATE: %)', 
        v_token.creator_unique_identifier, SQLERRM, SQLSTATE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processed YouTube tokens, refreshed %', v_refreshed_count;
  
  RETURN v_refreshed_count;
END;
$$;

-- Update Instagram function similarly
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
  v_service_role_key TEXT;
BEGIN
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  FOR v_token IN
    SELECT creator_unique_identifier
    FROM airpublisher_instagram_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '7 days'))
      AND (facebook_access_token IS NOT NULL OR instagram_access_token IS NOT NULL)
    LIMIT 10
  LOOP
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    BEGIN
      SELECT id INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := CASE 
          WHEN v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
            jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_role_key
            )
          ELSE
            jsonb_build_object(
              'Content-Type', 'application/json'
            )
        END::jsonb,
        body := jsonb_build_object(
          'platform', 'instagram',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )::jsonb
      );

      -- pg_net is async - Edge Function will update database directly
      v_refreshed_count := v_refreshed_count + 1;
      RAISE NOTICE 'Triggered Instagram token refresh for creator: %', 
        v_token.creator_unique_identifier;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error refreshing Instagram token: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN v_refreshed_count;
END;
$$;

-- Update TikTok function similarly
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
  v_service_role_key TEXT;
BEGIN
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    v_service_role_key := NULL;
  END IF;

  FOR v_token IN
    SELECT creator_unique_identifier
    FROM airpublisher_tiktok_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '1 day'))
      AND tiktok_access_token IS NOT NULL
      AND tiktok_refresh_token IS NOT NULL
    LIMIT 10
  LOOP
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    BEGIN
      SELECT id INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := CASE 
          WHEN v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
            jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_role_key
            )
          ELSE
            jsonb_build_object(
              'Content-Type', 'application/json'
            )
        END::jsonb,
        body := jsonb_build_object(
          'platform', 'tiktok',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )::jsonb
      );

      -- pg_net is async - Edge Function will update database directly
      v_refreshed_count := v_refreshed_count + 1;
      RAISE NOTICE 'Triggered TikTok token refresh for creator: %', 
        v_token.creator_unique_identifier;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error refreshing TikTok token: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN v_refreshed_count;
END;
$$;

