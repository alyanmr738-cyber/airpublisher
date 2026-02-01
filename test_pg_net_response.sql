-- Test how to get response from pg_net
-- net.http_response might be a function, not a table

-- Option 1: Try as a function
SELECT net.http_response(6);

-- Option 2: Check what net.http_response actually is
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'net' 
  AND routine_name LIKE '%http%';

-- Option 3: Check if there's a different way to get responses
SELECT * FROM pg_proc 
WHERE proname LIKE '%http%' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'net');

