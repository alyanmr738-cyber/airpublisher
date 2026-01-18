import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase/types'

/**
 * This endpoint syncs the session from client-side (localStorage) to server-side (cookies)
 * After login, the client calls this to ensure cookies are set for server-side auth
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Get the session token from the request body (sent from client after login)
    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      )
    }

    // Create a server client with cookie handling
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: options?.httpOnly ?? true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              })
            })
          },
        },
      }
    )

    // The session cookie should already be set by the browser after login
    // This endpoint just verifies the session is accessible server-side
    // and refreshes cookies if needed
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[sync-session] Error getting session:', error)
      // Try to set the session if we have tokens
      if (access_token) {
        const setSessionResult = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token || access_token,
        })
        if (setSessionResult.error) {
          return NextResponse.json(
            { error: 'Failed to sync session' },
            { status: 500 }
          )
        }
        if (setSessionResult.data.session) {
          console.log('[sync-session] ✅ Session set from tokens:', setSessionResult.data.user?.id)
          return NextResponse.json({
            success: true,
            user: setSessionResult.data.user,
          })
        }
      }
      return NextResponse.json(
        { error: 'Session not found and could not be set' },
        { status: 401 }
      )
    }

    if (session) {
      console.log('[sync-session] ✅ Session found in cookies:', session.user.id)
      return NextResponse.json({
        success: true,
        user: session.user,
      })
    }

    return NextResponse.json(
      { error: 'Session not found' },
      { status: 401 }
    )
  } catch (error: any) {
    console.error('[sync-session] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

