import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPost } from '@/lib/ayrshare/api'
import { verifyN8nWebhook } from '@/lib/webhooks/n8n'
import { getAyrshareProfile } from '@/lib/ayrshare/user'

/**
 * Post content via Ayrshare API
 * Can be called by n8n or directly from the app
 */
export async function POST(request: Request) {
  try {
    // Verify webhook if called by n8n
    const isValid = await verifyN8nWebhook(request)
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      video_id,
      creator_unique_identifier, // Required: which user is posting
      title,
      description,
      video_url,
      thumbnail_url,
      platforms, // e.g., ['youtube', 'instagram', 'tiktok']
      scheduled_at,
    } = body

    if (!title || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title, platforms (array)' },
        { status: 400 }
      )
    }

    if (!creator_unique_identifier) {
      return NextResponse.json(
        { error: 'Missing required field: creator_unique_identifier' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user's Ayrshare profile
    const ayrshareProfile = await getAyrshareProfile(creator_unique_identifier)
    if (!ayrshareProfile) {
      return NextResponse.json(
        { error: 'Ayrshare profile not found. Please connect your accounts in Settings.' },
        { status: 404 }
      )
    }

    // Get video details if video_id provided
    let video = null
    if (video_id) {
      const { data, error } = await supabase
        .from('air_publisher_videos')
        .select('*')
        .eq('id', video_id)
        .single()

      if (error) {
        console.error('Error fetching video:', error)
      } else {
        video = data
      }
    }

    // Build post text
    const postText = description || title

    // Build media URLs
    const mediaUrls: string[] = []
    if (video_url) mediaUrls.push(video_url)
    if (thumbnail_url) mediaUrls.push(thumbnail_url)

    // Get Ayrshare API key (master key)
    const ayrshareApiKey = process.env.AYRSHARE_API_KEY
    if (!ayrshareApiKey) {
      return NextResponse.json(
        { error: 'AYRSHARE_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Use user's profileKey if available (Business Plan), otherwise use master key
    const profileKey = ayrshareProfile.ayrshare_profile_key

    // Create post via Ayrshare using user's profile
    const ayrsharePost = await createPost({
      post: postText,
      platforms: platforms,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      scheduleDate: scheduled_at || (video?.scheduled_at || undefined),
    }, ayrshareApiKey, profileKey || undefined) // Pass profileKey if available

    // Update video status if video_id provided
    if (video_id && video) {
      await supabase
        .from('air_publisher_videos')
        .update({
          status: scheduled_at ? 'scheduled' : 'posted',
          posted_at: scheduled_at ? null : new Date().toISOString(),
        })
        .eq('id', video_id)
    }

    return NextResponse.json({
      success: true,
      post: ayrsharePost,
      message: 'Post created successfully via Ayrshare',
    })
  } catch (error: any) {
    console.error('Ayrshare post error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create post via Ayrshare' },
      { status: 500 }
    )
  }
}

