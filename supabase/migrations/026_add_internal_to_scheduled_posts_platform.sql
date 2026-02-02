-- Migration: Add 'internal' to allowed platforms in air_publisher_scheduled_posts
-- The UI allows scheduling posts to 'internal' platform, but the check constraint didn't allow it

-- Drop the old constraint
ALTER TABLE air_publisher_scheduled_posts
  DROP CONSTRAINT IF EXISTS air_publisher_scheduled_posts_platform_check;

-- Add the new constraint that includes 'internal'
ALTER TABLE air_publisher_scheduled_posts
  ADD CONSTRAINT air_publisher_scheduled_posts_platform_check
  CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'internal'));

