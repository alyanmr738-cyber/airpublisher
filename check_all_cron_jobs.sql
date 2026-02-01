-- Check all token-related cron jobs
-- Run this to see all your scheduled jobs

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%token%' OR jobname LIKE '%refresh%'
ORDER BY jobid;

-- Expected results:
-- Job 3: refresh-expired-youtube-tokens (every 10 minutes)
-- Job 4: refresh-expired-instagram-tokens (every 6 hours)
-- Job 7: refresh-expired-youtube-tokens (if migration 021 created a new one)
-- Job 8: refresh-expired-instagram-tokens (if migration 021 created a new one)

-- If you see duplicate jobs (e.g., job 3 and job 7 both for YouTube),
-- you can remove the old ones:
-- SELECT cron.unschedule('refresh-expired-youtube-tokens'); -- This will remove the one with that name

