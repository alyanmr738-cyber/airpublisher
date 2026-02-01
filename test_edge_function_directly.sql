-- Test Edge Function directly to see if it's working
-- This will help diagnose why there are no logs

-- 1. Test if pg_net is working at all
SELECT net.http_post(
  url := 'https://httpbin.org/post',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('test', 'value')
) as test_request_id;

-- 2. Test calling the Edge Function directly
SELECT net.http_post(
  url := 'https://pezvnqhexxttlhcnbtta.supabase.co/functions/v1/refresh-token',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object(
    'platform', 'youtube',
    'creator_unique_identifier', 'creator_735175e5_1768726539_f7262d3a'
  )
) as edge_function_request_id;

-- 3. Check if the function actually runs
SELECT refresh_expired_youtube_tokens();

-- Note: pg_net is async, so we can't check the response
-- But we should see logs in Edge Function if it receives the request

