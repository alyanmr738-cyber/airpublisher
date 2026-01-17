import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

/**
 * Client-side Supabase client
 * Uses @supabase/ssr which automatically handles PKCE code verifier in cookies
 * Important: Cookies must be accessible for PKCE to work across redirects
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables')
    // Return a mock client to prevent crashes
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  // createBrowserClient automatically handles PKCE code verifier in cookies
  // It uses document.cookie which works across same-origin redirects
  // For ngrok/production, cookies are automatically handled by the browser
  return createBrowserClient<Database>(url, key)
}

