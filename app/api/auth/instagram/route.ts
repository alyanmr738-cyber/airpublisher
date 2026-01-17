import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentCreator } from '@/lib/db/creator'

/**
 * Initiate Instagram OAuth flow
 * Note: Instagram uses Facebook OAuth (Instagram Graph API)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    let user = null
    let authError = null

    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user || null
      authError = authResult.error || null
      console.log('[Instagram OAuth] Auth check:', {
        hasUser: !!user,
        userEmail: user?.email,
        error: authError?.message || null,
      })
    } catch (error: any) {
      console.error('[Instagram OAuth] Auth check exception:', error?.message || String(error))
      authError = error
    }

    // In development, allow OAuth even without user (for testing)
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment && (!user || authError)) {
      console.error('[Instagram OAuth] Auth failed, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Try to get creator profile (but don't require it)
    let creator = null
    if (user) {
      try {
        creator = await getCurrentCreator()
      } catch (error: any) {
        console.error('[Instagram OAuth] Error fetching creator:', error?.message || String(error))
      }
    }

    // Debug: Log environment variables (without exposing secrets)
    console.log('[Instagram OAuth] Environment check:', {
      hasMETA_APP_ID: !!process.env.META_APP_ID,
      hasINSTAGRAM_APP_ID: !!process.env.INSTAGRAM_APP_ID,
      META_APP_ID_length: process.env.META_APP_ID?.length || 0,
      INSTAGRAM_APP_ID_length: process.env.INSTAGRAM_APP_ID?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
    })

    const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`
    
    if (!appId) {
      console.error('[Instagram OAuth] Missing app ID. Available env vars:', {
        META_APP_ID: process.env.META_APP_ID ? 'SET (hidden)' : 'NOT SET',
        INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID ? 'SET (hidden)' : 'NOT SET',
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('META') || key.includes('INSTAGRAM') || key.includes('APP')),
      })
      return NextResponse.json(
        { 
          error: 'Instagram OAuth not configured. Please set META_APP_ID or INSTAGRAM_APP_ID in environment variables.',
          debug: {
            hasMETA_APP_ID: !!process.env.META_APP_ID,
            hasINSTAGRAM_APP_ID: !!process.env.INSTAGRAM_APP_ID,
            hint: 'Make sure you added the variables to .env.local and restarted the dev server',
          }
        },
        { status: 500 }
      )
    }

    // Generate state
    const state = Buffer.from(JSON.stringify({
      creator_unique_identifier: creator?.unique_identifier || null,
      user_id: user?.id || null,
    })).toString('base64url')

    // Instagram API with Instagram Login - New scopes (replaces old ones as of Jan 27, 2025)
    // Note: These scopes don't require Facebook Pages
    const scopes = [
      'instagram_business_basic',           // Basic profile info
      'instagram_business_content_publish', // Publish content
      // Optional scopes:
      // 'instagram_business_manage_comments', // Manage comments
      // 'instagram_business_manage_messages', // Manage messages
    ].join(',')

    // Build OAuth URL - Using Instagram Business Login (direct Instagram OAuth)
    // This uses Instagram's own OAuth endpoint, not Facebook's
    // See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
    const authUrl = new URL('https://www.instagram.com/oauth/authorize')
    authUrl.searchParams.set('client_id', appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Instagram OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Instagram OAuth' },
      { status: 500 }
    )
  }
}

