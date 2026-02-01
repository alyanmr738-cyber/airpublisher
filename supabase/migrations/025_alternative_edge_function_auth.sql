-- Migration: Alternative approach for Edge Function authentication
-- If service role key is not accessible, we can try calling without auth
-- OR use a different authentication method

-- Option 1: Try calling Edge Function without Authorization header
-- (Only works if Edge Function allows unauthenticated calls from same project)
CREATE OR REPLACE FUNCTION refresh_expired_youtube_tokens_v2()
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
  v_response_status INT;
  v_response_body TEXT;
BEGIN
  FOR v_token IN
    SELECT 
      creator_unique_identifier,
      google_refresh_token
    FROM airpublisher_youtube_tokens
    WHERE (expires_at IS NULL OR expires_at <= (NOW() + INTERVAL '5 minutes'))
      AND google_refresh_token IS NOT NULL
    LIMIT 10
  LOOP
    v_edge_function_url := v_supabase_url || '/functions/v1/refresh-token';
    
    BEGIN
      -- Try without Authorization header first
      -- Supabase Edge Functions in same project might allow this
      SELECT request_id INTO v_request_id
      FROM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        )::jsonb,
        body := jsonb_build_object(
          'platform', 'youtube',
          'creator_unique_identifier', v_token.creator_unique_identifier
        )::jsonb
      );

      -- Poll for response
      FOR i IN 1..10 LOOP
        SELECT status_code, content INTO v_response_status, v_response_body
        FROM net.http_response
        WHERE request_id = v_request_id
        LIMIT 1;

        IF v_response_status IS NOT NULL THEN
          EXIT;
        END IF;

        PERFORM pg_sleep(0.5);
      END LOOP;

      IF v_response_status >= 200 AND v_response_status < 300 THEN
        v_refreshed_count := v_refreshed_count + 1;
        RAISE NOTICE 'Successfully refreshed token (no auth) for creator: %', 
          v_token.creator_unique_identifier;
      ELSIF v_response_status = 401 THEN
        RAISE WARNING 'Edge Function requires auth. Status: 401. Need to configure service role key.';
      ELSE
        RAISE WARNING 'Failed to refresh token. Status: %, Response: %', 
          v_response_status, COALESCE(v_response_body, 'No response');
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error calling Edge Function: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN v_refreshed_count;
END;
$$;

-- Test the alternative function
-- SELECT refresh_expired_youtube_tokens_v2();

