-- Test pg_net syntax to find the correct way to use it
-- pg_net API might be different than expected

-- Option 1: Try without selecting a column (returns the whole row)
SELECT * FROM net.http_post(
  url := 'https://httpbin.org/post',
  headers := jsonb_build_object('Content-Type', 'application/json')::jsonb,
  body := jsonb_build_object('test', 'value')::jsonb
) LIMIT 1;

-- Option 2: Check what columns net.http_post actually returns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'http_post' 
  AND table_schema = 'net';

-- Option 3: Try using it as a function that returns a table
-- The actual return might be different

