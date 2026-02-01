-- Test if Edge Function can be called from database
-- This helps diagnose the issue

-- 1. Check if pg_net extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 2. Test a simple HTTP call (to verify pg_net works)
SELECT * FROM net.http_get('https://httpbin.org/get') LIMIT 1;

-- 3. Try calling Edge Function directly
-- This will show if the call succeeds or fails
DO $$
DECLARE
  v_request_id BIGINT;
  v_status_code INT;
  v_response_body TEXT;
BEGIN
  -- Make request to Edge Function
  -- pg_net.http_post returns the request ID directly as bigint
  SELECT net.http_post(
    url := 'https://pezvnqhexxttlhcnbtta.supabase.co/functions/v1/refresh-token',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )::jsonb,
    body := jsonb_build_object(
      'platform', 'youtube',
      'creator_unique_identifier', 'creator_735175e5_1768726539_f7262d3a'
    )::jsonb
  ) INTO v_request_id;

  RAISE NOTICE 'Request ID: %', v_request_id;

  -- Wait for response
  FOR i IN 1..10 LOOP
    SELECT status_code, content INTO v_status_code, v_response_body
    FROM net.http_response
    WHERE request_id = v_request_id
    LIMIT 1;

    IF v_status_code IS NOT NULL THEN
      EXIT;
    END IF;

    PERFORM pg_sleep(0.5);
  END LOOP;

  RAISE NOTICE 'Status Code: %', v_status_code;
  RAISE NOTICE 'Response: %', v_response_body;
END $$;

