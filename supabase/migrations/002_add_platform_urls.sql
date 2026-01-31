-- Migration: Add platform URL columns to air_publisher_videos
-- These columns store the published video URLs for each platform

-- Add platform URL columns
ALTER TABLE air_publisher_videos
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN air_publisher_videos.youtube_url IS 'URL of the video published on YouTube';
COMMENT ON COLUMN air_publisher_videos.instagram_url IS 'URL of the video published on Instagram';
COMMENT ON COLUMN air_publisher_videos.tiktok_url IS 'URL of the video published on TikTok';

-- Create index for platform URL lookups (useful for metrics collection)
CREATE INDEX IF NOT EXISTS idx_air_publisher_videos_youtube_url 
  ON air_publisher_videos(youtube_url) WHERE youtube_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_air_publisher_videos_instagram_url 
  ON air_publisher_videos(instagram_url) WHERE instagram_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_air_publisher_videos_tiktok_url 
  ON air_publisher_videos(tiktok_url) WHERE tiktok_url IS NOT NULL;

