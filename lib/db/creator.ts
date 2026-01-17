import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type CreatorProfile = Database['public']['Tables']['creator_profiles']['Row']

export async function getCreatorProfile(uniqueIdentifier: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('unique_identifier', uniqueIdentifier)
    .single()

  if (error) {
    console.error('[getCreatorProfile] Error:', error)
    throw new Error(error.message || `Failed to fetch creator profile: ${JSON.stringify(error)}`)
  }
  
  // Map your actual column names to the expected format
  const profile = data as any
  return {
    ...profile,
    display_name: profile.handles || profile.display_name || null, // Map 'handles' to 'display_name'
    niche: profile.Niche || profile.niche || null, // Map 'Niche' (capitalized) to 'niche'
    avatar_url: profile.profile_pic_url || profile.avatar_url || null, // Map 'profile_pic_url' to 'avatar_url'
  } as CreatorProfile
}

export async function getCreatorByUserId(userId: string) {
  const supabase = await createClient()
  
  console.log('[getCreatorByUserId] Searching for userId:', userId)
  
  // Lookup directly from airpublisher_creator_profiles (main profile table)
  const { data: profileData, error: profileError } = await supabase
    .from('airpublisher_creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  console.log('[getCreatorByUserId] Profile lookup result:', {
    found: !!profileData,
    unique_identifier: profileData?.creator_unique_identifier || null,
    error: profileError?.message || null,
  })

  if (!profileError && profileData) {
    console.log('[getCreatorByUserId] ✅ Found profile:', profileData.creator_unique_identifier)
    const profile = profileData as any
    return {
      unique_identifier: profile.creator_unique_identifier,
      display_name: profile.handles || null,
      niche: profile.Niche || null,
      avatar_url: profile.profile_pic_url || null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    } as CreatorProfile
  }
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.warn('[getCreatorByUserId] Could not find creator:', profileError.message || profileError)
    return null
  }
  
  console.log('[getCreatorByUserId] ❌ No profile found for user. User needs to create a profile.')
  return null
}

export async function getCurrentCreator(uniqueIdentifier?: string) {
  try {
    const supabase = await createClient()
    
    // Priority 1: Use provided unique_identifier (from query param)
    if (uniqueIdentifier) {
      try {
        console.log('[getCurrentCreator] Looking up by provided unique_identifier:', uniqueIdentifier)
        const { data, error } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('unique_identifier', uniqueIdentifier)
          .single()
        
        if (!error && data) {
          console.log('[getCurrentCreator] ✅ Found profile by provided unique_identifier')
          const profile = data as any
          return {
            ...profile,
            display_name: profile.handles || profile.display_name || null,
            niche: profile.Niche || profile.niche || null,
            avatar_url: profile.profile_pic_url || profile.avatar_url || null,
          } as CreatorProfile
        }
        if (error) {
          console.error('[getCurrentCreator] Error fetching by unique_identifier:', error.message || error)
        }
      } catch (e: any) {
        console.error('[getCurrentCreator] Exception fetching by unique_identifier:', e?.message || e)
      }
    }
    
    // TEMPORARY: Skip server-side session detection - rely on cookie/profile lookup
    // In development, we'll use cookie fallback or pattern matching
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Try to get user from server (non-blocking)
    let user = null
    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user || null
      if (user) {
        console.log('[getCurrentCreator] ✅ Found user from server:', user.id)
      }
    } catch (e: any) {
      // Ignore - we'll use fallback methods
      if (isDevelopment) {
        console.log('[getCurrentCreator] Server session not available (dev mode - using fallback)')
      }
    }

    // Priority 3: Check cookie for stored profile identifier
    // In development, use cookie even without user validation (server can't detect session)
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const cookieProfileId = cookieStore.get('creator_profile_id')?.value
      
      if (cookieProfileId) {
        console.log('[getCurrentCreator] Found profile ID in cookie:', cookieProfileId)
        
        // In development, just get profile by cookie (skip user validation)
        // In production, validate it belongs to current user
        if (isDevelopment || !user?.id) {
          // Dev mode: just get profile by unique_identifier
          const { data, error } = await supabase
            .from('airpublisher_creator_profiles')
            .select('*')
            .eq('creator_unique_identifier', cookieProfileId)
            .maybeSingle()
          
          if (!error && data) {
            console.log('[getCurrentCreator] ✅ Found profile from cookie (dev mode)')
            const profile = data as any
            return {
              unique_identifier: profile.creator_unique_identifier,
              display_name: profile.handles || null,
              niche: profile.Niche || null,
              avatar_url: profile.profile_pic_url || null,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            } as CreatorProfile
          }
        } else if (user?.id) {
          // Production: validate profile belongs to user
          const { data, error } = await supabase
            .from('airpublisher_creator_profiles')
            .select('*')
            .eq('user_id', user.id)
            .eq('creator_unique_identifier', cookieProfileId)
            .maybeSingle()
          
          if (!error && data) {
            console.log('[getCurrentCreator] ✅ Found profile from cookie (validated)')
            const profile = data as any
            return {
              unique_identifier: profile.creator_unique_identifier,
              display_name: profile.handles || null,
              niche: profile.Niche || null,
              avatar_url: profile.profile_pic_url || null,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            } as CreatorProfile
          } else {
            // Cookie profile doesn't belong to current user - clear it
            console.warn('[getCurrentCreator] ⚠️ Cookie profile does not belong to current user. Clearing cookie.')
            try {
              cookieStore.delete('creator_profile_id')
            } catch (e) {
              // Ignore cookie deletion errors
            }
          }
        }
      }
    } catch (e: any) {
      // Cookie access might fail in some contexts, that's okay
      console.log('[getCurrentCreator] Could not access cookies:', e?.message)
    }

    // Priority 4: Find the creator profile by user ID (if user exists)
    if (user?.id) {
      try {
        const creator = await getCreatorByUserId(user.id)
        
        // If found, store in cookie for future lookups
        if (creator?.unique_identifier) {
          try {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            cookieStore.set('creator_profile_id', creator.unique_identifier, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 365, // 1 year
            })
            console.log('[getCurrentCreator] Stored profile ID in cookie for future lookups')
          } catch (e) {
            // Cookie setting might fail in some contexts, that's okay
          }
        }
        
        return creator
      } catch (e: any) {
        console.error('[getCurrentCreator] Error in getCreatorByUserId:', e?.message || String(e))
        return null
      }
    } else {
      // No user ID - in development, try cookie fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('[getCurrentCreator] ⚠️ Development mode: No user ID, trying cookie fallback')
        try {
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          const cookieProfileId = cookieStore.get('creator_profile_id')?.value
          
          if (cookieProfileId) {
            const { data, error } = await supabase
              .from('airpublisher_creator_profiles')
              .select('*')
              .eq('creator_unique_identifier', cookieProfileId)
              .maybeSingle()
            
            if (!error && data) {
              console.log('[getCurrentCreator] ✅ Found profile from cookie (dev mode)')
              const profile = data as any
              return {
                unique_identifier: profile.creator_unique_identifier,
                display_name: profile.handles || null,
                niche: profile.Niche || null,
                avatar_url: profile.profile_pic_url || null,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              } as CreatorProfile
            }
          }
        } catch (e: any) {
          console.warn('[getCurrentCreator] Cookie fallback failed:', e?.message)
        }
      }
      
      return null
    }
  } catch (e: any) {
    console.error('[getCurrentCreator] Unexpected error:', e?.message || String(e))
    return null
  }
}

