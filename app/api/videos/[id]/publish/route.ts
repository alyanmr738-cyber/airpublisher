import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/utils/app-url'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const videoId = resolvedParams.id
    const body = await request.json()
    const { platform, postType, scheduledAt } = body

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      )
    }

    // Get creator unique identifier
    const { data: profile } = await supabase
      .from('airpublisher_creator_profiles')
      .select('creator_unique_identifier')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      )
    }

    if (postType === 'schedule') {
      // Schedule the post
      if (!scheduledAt) {
        return NextResponse.json(
          { error: 'Scheduled time is required' },
          { status: 400 }
        )
      }

      const scheduledDate = new Date(scheduledAt)
      if (scheduledDate < new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }

      // Insert into scheduled_posts table
      const { data: scheduledPost, error: scheduleError } = await (supabase
        .from('air_publisher_scheduled_posts') as any)
        .insert({
          video_id: videoId,
          creator_unique_identifier: (profile as any).creator_unique_identifier,
          platform: platform,
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending',
        })
        .select()
        .single()

      if (scheduleError) {
        console.error('Error scheduling post:', scheduleError)
        return NextResponse.json(
          { error: 'Failed to schedule post', details: scheduleError.message },
          { status: 500 }
        )
      }

      // Update video status
      await (supabase
        .from('air_publisher_videos') as any)
        .update({ status: 'scheduled' })
        .eq('id', videoId)

      return NextResponse.json({
        success: true,
        scheduled_post: scheduledPost,
        message: 'Video scheduled successfully',
      })
    } else {
      // Post now - trigger n8n webhook directly for instant posting
      const appUrl = getAppUrl()
      const webhookUrl = `${appUrl}/api/webhooks/n8n/post-video`
      
      console.log('[publish] Triggering post-video webhook:', {
        webhookUrl,
        videoId,
        platform,
      })

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-n8n-api-key': process.env.N8N_API_KEY || '',
        },
        body: JSON.stringify({
          video_id: videoId,
          platform: platform,
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        console.error('[publish] Webhook error:', errorData)
        return NextResponse.json(
          { error: 'Failed to post video', details: errorData.error || 'Unknown error' },
          { status: response.status || 500 }
        )
      }

      const result = await response.json()
      console.log('[publish] ✅ Video posted successfully:', result)

      return NextResponse.json({
        success: true,
        message: 'Video posted successfully',
        result,
      })
    }
  } catch (error) {
    console.error('Error in publish endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
