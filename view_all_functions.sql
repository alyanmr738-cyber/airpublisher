-- View all token-related database functions
-- Run this in Supabase SQL Editor

-- 1. List all functions related to tokens
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%token%' OR p.proname LIKE '%refresh%')
ORDER BY p.proname;

-- 2. List the specific functions we created
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%token%' OR routine_name LIKE '%refresh%')
ORDER BY routine_name;

-- 3. View the view we created
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'valid_platform_tokens';

-- 4. Test the YouTube token function (replace with actual creator_unique_identifier)
-- SELECT * FROM get_valid_youtube_token('your-creator-unique-identifier-here');

-- 5. Test the Instagram token function
-- SELECT * FROM get_valid_instagram_token('your-creator-unique-identifier-here');

-- 6. Test the TikTok token function
-- SELECT * FROM get_valid_tiktok_token('your-creator-unique-identifier-here');

-- 7. Query the view (shows all tokens)
-- SELECT * FROM valid_platform_tokens;

