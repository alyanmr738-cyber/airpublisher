import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getValidYouTubeAccessToken } from '@/lib/youtube/tokens'
import { getValidInstagramAccessToken } from '@/lib/instagram/tokens'

/**
 * Check if refresh tokens are valid for a creator
 * Returns status for each platform indicating if refresh token is expired
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get creator profile
    const { data: profile } = await (supabase
      .from('airpublisher_creator_profiles') as any)
      .select('unique_identifier')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
    }

    const creatorUniqueIdentifier = (profile as any).unique_identifier
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const platforms = ['youtube', 'instagram', 'tiktok']
    const status: Record<string, { refreshTokenExpired: boolean; hasTokens: boolean }> = {}

    for (const platform of platforms) {
      const tableName = `airpublisher_${platform}_tokens`
      
      // Get tokens
      const { data: tokens } = await (serviceClient
        .from(tableName) as any)
        .select('*')
        .eq('creator_unique_identifier', creatorUniqueIdentifier)
        .maybeSingle()

      if (!tokens) {
        status[platform] = { refreshTokenExpired: false, hasTokens: false }
        continue
      }

      // Try to refresh token to check if refresh token is valid
      let refreshTokenExpired = false
      
      try {
        if (platform === 'youtube') {
          const refreshToken = tokens.google_refresh_token || tokens.refresh_token
          if (!refreshToken) {
            refreshTokenExpired = true
          } else {
            // Try to refresh - if it fails, refresh token is expired
            const validToken = await getValidYouTubeAccessToken(tokens, creatorUniqueIdentifier)
            refreshTokenExpired = !validToken
          }
        } else if (platform === 'instagram') {
          // Instagram tokens are long-lived, check if we can refresh
          const validToken = await getValidInstagramAccessToken(tokens, creatorUniqueIdentifier)
          refreshTokenExpired = !validToken
        } else if (platform === 'tiktok') {
          // TikTok tokens typically don't expire
          const accessToken = tokens.tiktok_access_token || tokens.access_token
          refreshTokenExpired = !accessToken
        }
      } catch (error) {
        console.error(`[check-refresh-token] Error checking ${platform}:`, error)
        refreshTokenExpired = true
      }

      status[platform] = {
        refreshTokenExpired,
        hasTokens: true,
      }
    }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('[check-refresh-token] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


