import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables')
    // Return a mock client to prevent crashes
    return createServerClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op
          },
        },
      }
    )
  }

  try {
    const cookieStore = await cookies()
    
    // Debug: Log what cookies we're reading (only in development)
    if (process.env.NODE_ENV === 'development') {
      const allCookies = cookieStore.getAll()
      const supabaseCookies = allCookies.filter(c => 
        c.name.startsWith('sb-') || 
        c.name.includes('supabase') ||
        c.name.includes('auth')
      )
      
      if (supabaseCookies.length > 0) {
        console.log('[createClient] Found Supabase cookies:', supabaseCookies.map(c => c.name).join(', '))
      } else {
        console.log('[createClient] ⚠️ No Supabase cookies found. All cookies:', allCookies.map(c => c.name).join(', '))
      }
    }

    return createServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
                if (process.env.NODE_ENV === 'development') {
                  console.log('[createClient] Setting cookie:', name, 'value length:', value?.length || 0)
                }
              })
            } catch (e) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              if (process.env.NODE_ENV === 'development') {
                console.warn('[createClient] Could not set cookies in Server Component:', e)
              }
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Error creating Supabase server client:', error)
    // Return a mock client to prevent crashes
    return createServerClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op
          },
        },
      }
    )
  }
}

