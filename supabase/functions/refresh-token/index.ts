// Supabase Edge Function to refresh platform tokens
// This function can be called from database functions or directly

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { platform, creator_unique_identifier } = await req.json()

    if (!platform || !creator_unique_identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing platform or creator_unique_identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get tokens from database
    const tokenTable = `airpublisher_${platform}_tokens`
    const { data: tokens, error: tokenError } = await supabase
      .from(tokenTable)
      .select('*')
      .eq('creator_unique_identifier', creator_unique_identifier)
      .maybeSingle()

    if (tokenError || !tokens) {
      return new Response(
        JSON.stringify({ error: 'Tokens not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let newAccessToken: string | null = null
    let newExpiresAt: string | null = null

    if (platform === 'youtube') {
      const refreshToken = tokens.google_refresh_token || tokens.refresh_token
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: 'No refresh token available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Refresh YouTube token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      newAccessToken = data.access_token
      const expiresIn = data.expires_in || 3600
      newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

      // Update database
      await supabase
        .from(tokenTable)
        .update({
          google_access_token: newAccessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_unique_identifier', creator_unique_identifier)

    } else if (platform === 'instagram') {
      const accessToken = tokens.facebook_access_token || tokens.instagram_access_token
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'No access token available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Refresh Instagram token using Graph API
      const appId = Deno.env.get('INSTAGRAM_APP_ID') || Deno.env.get('META_APP_ID')
      const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET') || Deno.env.get('META_APP_SECRET')

      if (!appId || !appSecret) {
        return new Response(
          JSON.stringify({ error: 'Instagram App ID or Secret not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?` +
        `grant_type=ig_refresh_token&` +
        `access_token=${accessToken}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        const error = await response.text()
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      newAccessToken = data.access_token
      const expiresIn = data.expires_in || 5184000
      newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

      // Update database
      await supabase
        .from(tokenTable)
        .update({
          facebook_access_token: newAccessToken,
          instagram_access_token: newAccessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_unique_identifier', creator_unique_identifier)

    } else if (platform === 'tiktok') {
      // TikTok tokens typically don't expire, just return existing
      newAccessToken = tokens.tiktok_access_token || tokens.access_token
      newExpiresAt = tokens.expires_at
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: newAccessToken,
        expires_at: newExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

