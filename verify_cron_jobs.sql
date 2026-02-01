-- Script to verify cron jobs are set up correctly
-- Run this in your Supabase SQL Editor

-- Check all scheduled cron jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%token%' OR jobname LIKE '%refresh%'
ORDER BY jobid;

-- Check recent job executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname LIKE '%token%' OR jobname LIKE '%refresh%'
)
ORDER BY start_time DESC
LIMIT 20;

-- Expected jobs:
-- 1. refresh-expired-youtube-tokens (every 10 minutes)
-- 2. refresh-expired-instagram-tokens (every 6 hours)

