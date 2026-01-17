import { NextResponse } from 'next/server'
import { getProfiles } from '@/lib/ayrshare/api'
import { getAyrshareProfile } from '@/lib/ayrshare/user'
import { verifyN8nWebhook } from '@/lib/webhooks/n8n'
import { createClient } from '@/lib/supabase/server'

/**
 * Get connected social media profiles from Ayrshare for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get creator to find their Ayrshare profile
    const { searchParams } = new URL(request.url)
    const creatorUniqueIdentifier = searchParams.get('creator_unique_identifier')

    if (!creatorUniqueIdentifier) {
      return NextResponse.json(
        { error: 'Missing creator_unique_identifier parameter' },
        { status: 400 }
      )
    }

    // Get user's Ayrshare profile
    const ayrshareProfile = await getAyrshareProfile(creatorUniqueIdentifier)
    if (!ayrshareProfile) {
      return NextResponse.json(
        { error: 'Ayrshare profile not found. Please connect your accounts first.' },
        { status: 404 }
      )
    }

    // Get Ayrshare API key
    const ayrshareApiKey = process.env.AYRSHARE_API_KEY
    if (!ayrshareApiKey) {
      return NextResponse.json(
        { error: 'AYRSHARE_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Get profiles using user's profileKey (if Business Plan) or master key
    const profiles = await getProfiles(
      ayrshareApiKey,
      ayrshareProfile.ayrshare_profile_key || undefined
    )

    return NextResponse.json({
      success: true,
      profiles,
      count: profiles.length,
    })
  } catch (error: any) {
    console.error('Ayrshare profiles error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Ayrshare profiles' },
      { status: 500 }
    )
  }
}

