import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const apiKey = request.headers.get('x-n8n-api-key')
    const authHeader = request.headers.get('authorization')
    const expectedApiKey = process.env.N8N_API_KEY

    if (!expectedApiKey) {
      return NextResponse.json(
        { error: 'N8N_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Check authentication
    const providedKey = apiKey || authHeader?.replace('Bearer ', '')
    if (providedKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const beforeParam = searchParams.get('before')
    
    // Parse and normalize the 'before' timestamp
    // Handle malformed timestamps from n8n (e.g., "2026-02-01T17:04:42.311 05:00")
    let before: string
    if (beforeParam) {
      try {
        // Try to parse the timestamp - handle various formats
        // Fix common issues: space before timezone, missing Z, etc.
        let normalizedTimestamp = beforeParam.trim()
        
        // Fix space before timezone (e.g., "2026-02-01T17:04:42.311 05:00" -> "2026-02-01T17:04:42.311+05:00")
        normalizedTimestamp = normalizedTimestamp.replace(/(\d)\s+([+-]\d{2}):(\d{2})$/, '$1$2:$3')
        normalizedTimestamp = normalizedTimestamp.replace(/(\d)\s+(\d{2}):(\d{2})$/, '$1+$2:$3')
        
        // If no timezone, assume UTC
        if (!normalizedTimestamp.includes('Z') && !normalizedTimestamp.match(/[+-]\d{2}:\d{2}$/)) {
          normalizedTimestamp = normalizedTimestamp + 'Z'
        }
        
        // Validate by parsing
        const parsedDate = new Date(normalizedTimestamp)
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format')
        }
        
        // Convert to ISO string (ensures proper format)
        before = parsedDate.toISOString()
      } catch (error) {
        console.warn('[scheduled-posts] Invalid before parameter, using current time:', beforeParam)
        before = new Date().toISOString()
      }
    } else {
      before = new Date().toISOString()
    }

    // Create Supabase client with service role
    const supabase = await createClient()

    // Query scheduled posts that are due
    // Get posts where:
    // - status = 'pending'
    // - scheduled_at <= before (current time or specified time)
    // - Order by scheduled_at ASC (oldest first)
    const { data: scheduledPosts, error } = await (supabase
      .from('air_publisher_scheduled_posts') as any)
      .select(`
        id,
        video_id,
        creator_unique_identifier,
        platform,
        scheduled_at,
        status,
        created_at,
        videos:video_id (
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          platform_target
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', before)
      .order('scheduled_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching scheduled posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled posts', details: error.message },
        { status: 500 }
      )
    }

    // Format response
    const posts = (scheduledPosts || []).map((post: any) => ({
      scheduled_post_id: post.id,
      video_id: post.video_id,
      creator_unique_identifier: post.creator_unique_identifier,
      platform: post.platform,
      scheduled_at: post.scheduled_at,
      title: post.videos?.title || null,
      description: post.videos?.description || null,
      video_url: post.videos?.video_url || null,
      thumbnail_url: post.videos?.thumbnail_url || null,
    }))

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts,
      query_time: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in scheduled-posts endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
