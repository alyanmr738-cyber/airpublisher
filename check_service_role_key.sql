-- Check if service role key is accessible
-- This is needed for Edge Function calls from database

-- Try to get service role key
SELECT current_setting('app.settings.service_role_key', true) as service_role_key_available;

-- If NULL, the key is not set
-- We need to find another way to authenticate Edge Function calls

-- Alternative: Check if we can use Supabase's built-in auth
-- Edge Functions in the same project might not need explicit auth

