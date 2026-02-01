-- Verify all token refresh cron jobs are active
-- Run this to see all your scheduled token refresh jobs

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%token%' OR jobname LIKE '%refresh%'
ORDER BY jobid;

-- Expected jobs:
-- Job 6: refresh-expired-youtube-tokens (every 10 minutes)
-- Job 7: refresh-expired-instagram-tokens (every 6 hours)
-- Job 8: refresh-expired-tiktok-tokens (every 12 hours)

-- Check recent executions
SELECT 
  j.jobname,
  MAX(rd.start_time) as last_run,
  rd.status,
  rd.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE '%token%'
GROUP BY j.jobname, rd.status, rd.return_message
ORDER BY last_run DESC NULLS LAST;

