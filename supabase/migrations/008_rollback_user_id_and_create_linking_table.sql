-- Migration: Rollback user_id from creator_profiles and create airpublisher_creator_profiles linking table

-- Step 1: Drop ALL RLS policies on creator_profiles that might reference user_id
-- We'll drop all policies and recreate the correct ones
DROP POLICY IF EXISTS "Users can insert own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON creator_profiles;

-- Drop any other policies that might exist (in case they were created with different names)
-- This is a safety measure to ensure all policies are dropped
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'creator_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON creator_profiles', pol_name);
    END LOOP;
END $$;

-- Step 2: Drop the unique constraint on user_id (if it exists)
ALTER TABLE creator_profiles 
DROP CONSTRAINT IF EXISTS creator_profiles_user_id_key;

-- Step 3: Drop the index on user_id (if it exists)
DROP INDEX IF EXISTS idx_creator_profiles_user_id;

-- Step 4: Drop the foreign key constraint (if it exists)
-- Note: We need to find the constraint name first
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'creator_profiles'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE creator_profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Step 5: Drop the user_id column (now that policies are dropped)
ALTER TABLE creator_profiles 
DROP COLUMN IF EXISTS user_id;

-- Step 6: Restore original RLS policies (as they were before migration 007)
-- These are the original policies from migration 002 and 004
-- Note: The original policies assumed user_id existed, but since creator_profiles doesn't have user_id,
-- we'll use the policies from migration 004 which allow authenticated users

-- The original policies from migration 002 assumed user_id column existed
-- Since we're removing user_id, we'll use the policies from migration 004 which work without user_id
-- These allow authenticated users to insert/update and everyone to view (for leaderboards)

CREATE POLICY "Users can insert own profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (true); -- Allow authenticated users to insert (application verifies ownership)

CREATE POLICY "Users can view own profile"
  ON creator_profiles FOR SELECT
  USING (true); -- Allow viewing all profiles (for leaderboards and public access)

CREATE POLICY "Users can update own profile"
  ON creator_profiles FOR UPDATE
  USING (true) -- Allow updating (application verifies ownership)
  WITH CHECK (true);

-- Also restore the "Anyone can view profiles" policy if it doesn't exist
-- This was in the original migration 002
CREATE POLICY "Anyone can view profiles"
  ON creator_profiles FOR SELECT
  USING (true);

-- Step 6: Ensure unique_identifier has a UNIQUE constraint (required for foreign key)
-- Check if unique constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'creator_profiles'::regclass
    AND contype = 'u'
    AND conkey::text[] = ARRAY['unique_identifier']::text[]
  ) THEN
    ALTER TABLE creator_profiles 
    ADD CONSTRAINT creator_profiles_unique_identifier_key UNIQUE (unique_identifier);
  END IF;
END $$;

-- Step 7: Create the new linking table
CREATE TABLE IF NOT EXISTS airpublisher_creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_unique_identifier TEXT NOT NULL REFERENCES creator_profiles(unique_identifier) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id), -- One profile per user
  UNIQUE(creator_unique_identifier) -- One user per profile
);

-- Step 8: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_airpublisher_creator_profiles_user_id 
  ON airpublisher_creator_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_airpublisher_creator_profiles_creator_id 
  ON airpublisher_creator_profiles(creator_unique_identifier);

-- Step 9: Enable RLS on the new table
ALTER TABLE airpublisher_creator_profiles ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for the linking table
CREATE POLICY "Users can view own linking record"
  ON airpublisher_creator_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linking record"
  ON airpublisher_creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linking record"
  ON airpublisher_creator_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own linking record"
  ON airpublisher_creator_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Step 11: Add comment
COMMENT ON TABLE airpublisher_creator_profiles IS 'Linking table between auth.users and creator_profiles. Tracks which user owns which creator profile.';

