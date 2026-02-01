import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Refresh YouTube access token using refresh token
 */
async function refreshYouTubeToken(
  refreshToken: string,
  creatorUniqueIdentifier: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    console.log('[refreshYouTubeToken] Refreshing YouTube token for creator:', creatorUniqueIdentifier)
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[refreshYouTubeToken] Token refresh failed:', error)
      
      // Check if refresh token is invalid/expired
      try {
        const errorJson = JSON.parse(error)
        if (errorJson.error === 'invalid_grant' || errorJson.error_description?.includes('Token has been expired')) {
          console.error('[refreshYouTubeToken] Refresh token is expired or invalid')
          // Mark refresh token as expired in database
          const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Try to update a flag indicating refresh token is expired
          // We'll add a refresh_token_expired field or use a convention
          await (serviceClient
            .from('airpublisher_youtube_tokens') as any)
            .update({ 
              updated_at: new Date().toISOString(),
              // Note: We can't store refresh_token_expired in the table without migration
              // But we can log it and return null to indicate refresh token issue
            })
            .eq('creator_unique_identifier', creatorUniqueIdentifier)
            .catch(() => {
              // Ignore update errors - table might not have the field
            })
        }
      } catch {
        // Error response is not JSON, continue
      }
      
      return null
    }

    const data = await response.json()
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600, // Default to 1 hour
    }
  } catch (error) {
    console.error('[refreshYouTubeToken] Error:', error)
    return null
  }
}

/**
 * Get valid YouTube access token, automatically refreshing if expired
 * Updates the database with the new token if refreshed
 * 
 * Returns:
 * - string: Valid access token
 * - null: Token refresh failed (refresh token may be expired/invalid)
 */
export async function getValidYouTubeAccessToken(
  tokens: any,
  creatorUniqueIdentifier: string
): Promise<string | null> {
  try {
    const accessToken = tokens.google_access_token || tokens.access_token
    const refreshToken = tokens.google_refresh_token || tokens.refresh_token
    const expiresAt = tokens.expires_at

    if (!accessToken || !refreshToken) {
      console.warn('[getValidYouTubeAccessToken] Missing access token or refresh token')
      return null
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date()
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // If no expires_at or token is expired/expiring soon, refresh it
    if (!expiresAtDate || expiresAtDate <= fiveMinutesFromNow) {
      console.log('[getValidYouTubeAccessToken] Access token expired or expiring soon, refreshing...')
      
      const refreshResult = await refreshYouTubeToken(refreshToken, creatorUniqueIdentifier)
      
      if (!refreshResult) {
        console.error('[getValidYouTubeAccessToken] Failed to refresh token')
        return null
      }

      // Update database with new token
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const newExpiresAt = new Date(now.getTime() + refreshResult.expires_in * 1000).toISOString()

      // Try new table first
      const newTokenTable = 'airpublisher_youtube_tokens'
      const { error: updateError } = await (serviceClient
        .from(newTokenTable) as any)
        .update({
          google_access_token: refreshResult.access_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_unique_identifier', creatorUniqueIdentifier)

      // If new table update failed, try old table
      if (updateError) {
        const oldTokenTable = 'youtube_tokens'
        const { error: oldUpdateError } = await (serviceClient
          .from(oldTokenTable) as any)
          .update({
            google_access_token: refreshResult.access_token,
            access_token: refreshResult.access_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('creator_unique_identifier', creatorUniqueIdentifier)

        if (oldUpdateError) {
          console.error('[getValidYouTubeAccessToken] Failed to update token in database:', oldUpdateError)
        }
      }

      console.log('[getValidYouTubeAccessToken] ✅ Successfully refreshed and updated token')
      return refreshResult.access_token
    }

    // Token is still valid
    console.log('[getValidYouTubeAccessToken] Token is still valid, using existing token')
    return accessToken
  } catch (error) {
    console.error('[getValidYouTubeAccessToken] Error:', error)
    return null
  }
}
