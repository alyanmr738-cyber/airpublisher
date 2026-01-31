import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get creator unique identifier
    const { data: profile } = await supabase
      .from('airpublisher_creator_profiles')
      .select('creator_unique_identifier')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ videos: [] })
    }

    // Get videos for this creator
    const { data: videos, error } = await supabase
      .from('air_publisher_videos')
      .select('*')
      .eq('creator_unique_identifier', (profile as any).creator_unique_identifier)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching videos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ videos: videos || [] })
  } catch (error) {
    console.error('Error in videos endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

