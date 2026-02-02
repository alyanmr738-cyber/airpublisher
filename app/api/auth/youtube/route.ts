import { NextResponse } from 'next/server'

// Force dynamic rendering - this route uses cookies and request.url
export const dynamic = 'force-dynamic'

/**
 * Initiate YouTube OAuth flow via Supabase Edge Function
 * Redirects to Supabase Edge Function which handles the OAuth flow
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('[YouTube OAuth] NEXT_PUBLIC_SUPABASE_URL not configured')
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }

    const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, '')
    const edgeFunctionUrl = `${cleanSupabaseUrl}/functions/v1/alyan_youtubeauth`
    
    // Get origin from request for redirect back
    const requestUrl = new URL(request.url)
    const origin = requestUrl.origin
    
    // Redirect to Edge Function with init action
    const edgeFunctionInitUrl = new URL(edgeFunctionUrl)
    edgeFunctionInitUrl.searchParams.set('action', 'init')
    edgeFunctionInitUrl.searchParams.set('origin', origin)

    console.log('[YouTube OAuth] Redirecting to Edge Function:', edgeFunctionInitUrl.toString())
    return NextResponse.redirect(edgeFunctionInitUrl.toString())
  } catch (error) {
    console.error('YouTube OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate YouTube OAuth' },
      { status: 500 }
    )
  }
}

