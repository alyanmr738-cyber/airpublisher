import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/lib/supabase/types'

/**
 * OAuth callback handler
 * Supabase Auth redirects here after OAuth (Google, etc.)
 * This route must use the same cookie handling as the client to access PKCE code verifier
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('[OAuth Callback] Received callback:', {
    hasCode: !!code,
    hasError: !!error,
    error,
    errorDescription,
    url: requestUrl.toString(),
  })

  // If there's an error from OAuth provider
  if (error) {
    console.error('[OAuth Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
    )
  }

  // If no code, redirect to login
  if (!code) {
    console.error('[OAuth Callback] No code received')
    return NextResponse.redirect(new URL(`/login?error=no_code`, request.url))
  }

  try {
    // Create Supabase client with proper cookie handling for PKCE
    // Critical: Must read cookies from the incoming request to get PKCE code verifier
    const cookieStore = await cookies()
    const origin = requestUrl.origin
    let response = NextResponse.redirect(new URL(next, origin))

    // Log cookies for debugging (in production, check server logs)
    const allCookies = cookieStore.getAll()
    const supabaseCookieNames = allCookies
      .filter(c => c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('pkce'))
      .map(c => c.name)
    
    console.log('[OAuth Callback] Available cookies:', {
      count: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      supabaseCookies: supabaseCookieNames,
      hasSupabaseCookies: supabaseCookieNames.length > 0,
      // Check for PKCE code verifier specifically
      pkceCookies: allCookies.filter(c => c.name.includes('code-verifier') || c.name.includes('pkce')),
    })

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
              // Ensure cookies work with ngrok/production
              // For ngrok, don't set domain (let browser handle it)
              // For production, may need to set domain
              const isNgrok = origin.includes('ngrok') || origin.includes('localhost')
              const cookieOptions = {
                ...options,
                // Don't set domain for localhost/ngrok - let browser handle it
                domain: isNgrok ? undefined : options?.domain,
                sameSite: (options?.sameSite || 'lax') as 'lax' | 'strict' | 'none',
                secure: options?.secure ?? origin.startsWith('https://'),
                path: options?.path || '/',
                httpOnly: options?.httpOnly ?? false, // Must be false for client-side access
              }
              cookieStore.set(name, value, cookieOptions)
              response.cookies.set(name, value, cookieOptions)
            })
          },
        },
      }
    )

    console.log('[OAuth Callback] Exchanging code for session...')
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[OAuth Callback] Exchange error:', exchangeError)
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    if (data?.session) {
      console.log('[OAuth Callback] ✅ Session created successfully:', {
        userId: data.session.user.id,
        email: data.session.user.email,
        emailConfirmed: data.session.user.email_confirmed_at ? 'Yes' : 'No',
      })
      
      // Success! Return the redirect response (cookies already set)
      return response
    } else {
      // Check if this is an email confirmation callback
      const type = requestUrl.searchParams.get('type')
      if (type === 'signup' || type === 'email') {
        console.log('[OAuth Callback] Email confirmation callback - redirecting to login')
        return NextResponse.redirect(new URL('/login?message=' + encodeURIComponent('Email verified! You can now sign in.'), request.url))
      }
      
      console.error('[OAuth Callback] No session in response')
      return NextResponse.redirect(new URL(`/login?error=no_session`, request.url))
    }
  } catch (err: any) {
    console.error('[OAuth Callback] Exception:', err)
    return NextResponse.redirect(
      new URL(`/login?error=callback_exception&details=${encodeURIComponent(err?.message || 'Unknown error')}`, request.url)
    )
  }
}

