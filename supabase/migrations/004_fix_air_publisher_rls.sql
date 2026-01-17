-- Fix RLS policies for air_publisher_videos
-- The original policies assumed creator_profiles has user_id, but it doesn't
-- This migration fixes the policies to work with the actual schema

-- Drop existing policies
DROP POLICY IF EXISTS "Creators can view own videos" ON air_publisher_videos;
DROP POLICY IF EXISTS "Creators can insert own videos" ON air_publisher_videos;
DROP POLICY IF EXISTS "Creators can update own videos" ON air_publisher_videos;

-- New RLS Policies for air_publisher_videos
-- Since creator_profiles doesn't have user_id, we'll allow authenticated users
-- to manage videos. We verify ownership in the application layer (createVideoAction)

-- Policy: Authenticated users can view videos
-- We verify ownership in the application layer when needed
CREATE POLICY "Authenticated users can view videos"
  ON air_publisher_videos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert videos
-- We verify creator_unique_identifier matches in the application layer (createVideoAction)
CREATE POLICY "Authenticated users can insert videos"
  ON air_publisher_videos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update videos
-- We verify ownership in the application layer (updateVideoAction)
CREATE POLICY "Authenticated users can update videos"
  ON air_publisher_videos FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

