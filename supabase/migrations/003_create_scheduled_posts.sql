-- Migration: Create air_publisher_scheduled_posts table
-- This table stores scheduled posts with specific date/time for each platform

CREATE TABLE IF NOT EXISTS air_publisher_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES air_publisher_videos(id) ON DELETE CASCADE,
  creator_unique_identifier TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  
  -- Scheduled time with full date/time precision
  scheduled_at TIMESTAMPTZ NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'cancelled')),
  
  -- Error tracking
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate scheduling
  UNIQUE(video_id, platform, scheduled_at)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON air_publisher_scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON air_publisher_scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pending ON air_publisher_scheduled_posts(scheduled_at, status) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_creator ON air_publisher_scheduled_posts(creator_unique_identifier);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_video ON air_publisher_scheduled_posts(video_id);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON air_publisher_scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE air_publisher_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Creators can view and manage their own scheduled posts
-- Uses airpublisher_creator_profiles linking table to get user_id
CREATE POLICY "Creators can view own scheduled posts"
  ON air_publisher_scheduled_posts FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM airpublisher_creator_profiles 
    WHERE creator_unique_identifier = air_publisher_scheduled_posts.creator_unique_identifier
  ));

CREATE POLICY "Creators can insert own scheduled posts"
  ON air_publisher_scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM airpublisher_creator_profiles 
    WHERE creator_unique_identifier = air_publisher_scheduled_posts.creator_unique_identifier
  ));

CREATE POLICY "Creators can update own scheduled posts"
  ON air_publisher_scheduled_posts FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM airpublisher_creator_profiles 
    WHERE creator_unique_identifier = air_publisher_scheduled_posts.creator_unique_identifier
  ));

CREATE POLICY "Creators can delete own scheduled posts"
  ON air_publisher_scheduled_posts FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM airpublisher_creator_profiles 
    WHERE creator_unique_identifier = air_publisher_scheduled_posts.creator_unique_identifier
  ));

-- Comments for documentation
COMMENT ON TABLE air_publisher_scheduled_posts IS 'Stores scheduled posts with specific date/time for each platform';
COMMENT ON COLUMN air_publisher_scheduled_posts.scheduled_at IS 'Exact date and time when the post should be published (minute precision)';
COMMENT ON COLUMN air_publisher_scheduled_posts.status IS 'Current status: pending, processing, posted, failed, or cancelled';

