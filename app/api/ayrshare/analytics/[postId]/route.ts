import { NextResponse } from 'next/server'
import { getPostAnalytics } from '@/lib/ayrshare/api'
import { getAyrshareProfile } from '@/lib/ayrshare/user'
import { verifyN8nWebhook } from '@/lib/webhooks/n8n'
import { createClient } from '@/lib/supabase/server'

/**
 * Get analytics for an Ayrshare post
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> | { postId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { postId } = resolvedParams

    // Verify webhook if called by n8n
    const isValid = await verifyN8nWebhook(request)
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!postId) {
      return NextResponse.json(
        { error: 'Missing postId parameter' },
        { status: 400 }
      )
    }

    // Get creator_unique_identifier from query params
    const { searchParams } = new URL(request.url)
    const creatorUniqueIdentifier = searchParams.get('creator_unique_identifier')

    // Get Ayrshare API key
    const ayrshareApiKey = process.env.AYRSHARE_API_KEY
    if (!ayrshareApiKey) {
      return NextResponse.json(
        { error: 'AYRSHARE_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Get user's Ayrshare profile if creator_unique_identifier provided
    let profileKey: string | undefined
    if (creatorUniqueIdentifier) {
      const ayrshareProfile = await getAyrshareProfile(creatorUniqueIdentifier)
      profileKey = ayrshareProfile?.ayrshare_profile_key || undefined
    }

    const analytics = await getPostAnalytics(postId, ayrshareApiKey, profileKey)

    return NextResponse.json({
      success: true,
      analytics,
    })
  } catch (error: any) {
    console.error('Ayrshare analytics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch post analytics' },
      { status: 500 }
    )
  }
}

