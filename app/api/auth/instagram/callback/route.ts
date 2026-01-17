import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

/**
 * Instagram OAuth callback
 * Instagram uses Facebook OAuth, so we need to:
 * 1. Exchange code for Facebook access token
 * 2. Get Instagram Business Account ID
 * 3. Get long-lived token
 * 4. Store in instagram_tokens table
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/connections?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/connections?error=missing_code', request.url)
      )
    }

    // Decode state to get creator info
    let stateData: { creator_unique_identifier?: string; user_id?: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/settings/connections?error=invalid_state', request.url)
      )
    }

    // If creator_unique_identifier is missing from state, fetch it from creator profile
    let creatorUniqueIdentifier = stateData.creator_unique_identifier
    const userId = stateData.user_id
    
    if (!creatorUniqueIdentifier && userId) {
      console.log('[instagram-callback] creator_unique_identifier not in state, fetching from creator profile...')
      const supabase = await createClient()
      const { data: profiles, error: profileError } = await supabase
        .from('creator_profiles')
        .select('unique_identifier')
        .limit(1)
        .order('created_at', { ascending: false })
      
      if (!profileError && profiles && profiles.length > 0) {
        creatorUniqueIdentifier = profiles[0].unique_identifier
        console.log('[instagram-callback] Found creator_unique_identifier from profile:', creatorUniqueIdentifier)
      }
    }

    // If still no creator_unique_identifier, try to get from getCurrentCreator
    if (!creatorUniqueIdentifier) {
      try {
        const { getCurrentCreator } = await import('@/lib/db/creator')
        const creator = await getCurrentCreator()
        if (creator) {
          creatorUniqueIdentifier = creator.unique_identifier
          console.log('[instagram-callback] Found creator_unique_identifier from getCurrentCreator:', creatorUniqueIdentifier)
        }
      } catch (e) {
        console.warn('[instagram-callback] Could not get creator from getCurrentCreator:', e)
      }
    }

    // If still no creator_unique_identifier, we can't proceed
    if (!creatorUniqueIdentifier) {
      console.error('[instagram-callback] No creator_unique_identifier found - cannot store tokens')
      return NextResponse.redirect(
        new URL('/settings/connections?error=no_creator_profile', request.url)
      )
    }

    // Update stateData with resolved creator_unique_identifier
    const resolvedStateData = {
      creator_unique_identifier: creatorUniqueIdentifier,
      user_id: userId,
    }

    const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        new URL('/settings/connections?error=oauth_not_configured', request.url)
      )
    }

    // Step 1: Exchange code for short-lived access token
    // Instagram Business Login uses Instagram's own token endpoint, not Facebook's
    // See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(
        new URL('/settings/connections?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Instagram Business Login returns data in a different format:
    // { "data": [{ "access_token": "...", "user_id": "...", "permissions": "..." }] }
    let shortLivedToken: string | null = null
    let instagramUserId: string | null = null
    
    if (tokenData.data && Array.isArray(tokenData.data) && tokenData.data.length > 0) {
      shortLivedToken = tokenData.data[0].access_token
      instagramUserId = tokenData.data[0].user_id
    } else if (tokenData.access_token) {
      // Fallback: direct access_token (some responses might be different)
      shortLivedToken = tokenData.access_token
      instagramUserId = tokenData.user_id || null
    }

    if (!shortLivedToken) {
      console.error('Token response format:', JSON.stringify(tokenData, null, 2))
      return NextResponse.redirect(
        new URL('/settings/connections?error=no_access_token', request.url)
      )
    }

    // Step 2: Exchange for long-lived token (60 days)
    // Instagram Business Login uses Instagram Graph API, not Facebook Graph API
    // See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${appSecret}&` +
      `access_token=${shortLivedToken}`,
      { method: 'GET' }
    )

    let longLivedToken = shortLivedToken
    let expiresAt: string | null = null

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json()
      longLivedToken = longLivedData.access_token || shortLivedToken
      if (longLivedData.expires_in) {
        expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
      }
    } else {
      console.warn('Failed to get long-lived token, using short-lived token:', await longLivedResponse.text())
    }

    // Step 3: Get Instagram account info
    // Instagram Business Login provides user_id directly in token response
    // Use Instagram Graph API to get account details
    let instagramBusinessAccountId = instagramUserId // Instagram-scoped user ID from token
    let username = null

    if (instagramBusinessAccountId) {
      // Get Instagram account details using Instagram Graph API
      // Note: Instagram Business Login uses Instagram Graph API, not Facebook Graph API
      const igInfoResponse = await fetch(
        `https://graph.instagram.com/${instagramBusinessAccountId}?` +
        `fields=username,account_type&` +
        `access_token=${longLivedToken}`
      )
      
      if (igInfoResponse.ok) {
        const igInfo = await igInfoResponse.json()
        username = igInfo.username || null
        console.log('[instagram-callback] Instagram account info:', igInfo)
      } else {
        const errorText = await igInfoResponse.text()
        console.warn('[instagram-callback] Failed to get Instagram account info:', errorText)
      }
    }

    // Step 4: Store tokens in database
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await serviceClient
      .from('instagram_tokens')
      .select('user_id')
      .eq('user_id', resolvedStateData.user_id || 'null_user_id_dev')
      .maybeSingle()

    const tokenRecord = {
      user_id: resolvedStateData.user_id || null,
      creator_unique_identifier: resolvedStateData.creator_unique_identifier, // Store for easier lookup
      instagram_id: instagramBusinessAccountId || 'pending',
      access_token: longLivedToken,
      username: username,
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
      instagram_business_account_id: instagramBusinessAccountId,
      page_id: pageId,
    } as any

    if (existing) {
      const { error: updateError } = await serviceClient
        .from('instagram_tokens')
        .update(tokenRecord as Record<string, any>)
        .eq('user_id', resolvedStateData.user_id || 'null_user_id_dev')

      if (updateError) {
        console.error('Error updating Instagram tokens:', updateError)
        return NextResponse.redirect(
          new URL('/settings/connections?error=update_failed', request.url)
        )
      }
    } else {
      const { error: insertError } = await serviceClient
        .from('instagram_tokens')
        .insert(tokenRecord as Record<string, any>)

      if (insertError) {
        console.error('Error inserting Instagram tokens:', insertError)
        return NextResponse.redirect(
          new URL('/settings/connections?error=insert_failed', request.url)
        )
      }
    }

    return NextResponse.redirect(
      new URL('/settings/connections?success=instagram_connected', request.url)
    )
  } catch (error) {
    console.error('Instagram OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings/connections?error=callback_error', request.url)
    )
  }
}

