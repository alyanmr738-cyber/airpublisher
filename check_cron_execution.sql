-- Check if cron jobs have executed and their results
-- Run this to see execution history

SELECT 
  j.jobid,
  j.jobname,
  j.schedule,
  rd.runid,
  rd.status,
  rd.return_message,
  rd.start_time,
  rd.end_time,
  rd.end_time - rd.start_time as duration
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE '%token%'
ORDER BY rd.start_time DESC NULLS LAST
LIMIT 20;

-- If you see executions, check the return_message for:
-- "Found X YouTube tokens that need refresh"
-- "Found X Instagram tokens that need refresh"

-- To see just the latest execution for each job:
SELECT 
  j.jobname,
  MAX(rd.start_time) as last_run,
  rd.status,
  rd.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE '%token%'
GROUP BY j.jobname, rd.status, rd.return_message
ORDER BY last_run DESC;

