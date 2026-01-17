'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type CreatorContextType = {
  user: User | null
  creatorProfile: any | null
  loading: boolean
}

const CreatorContext = createContext<CreatorContextType>({
  user: null,
  creatorProfile: null,
  loading: true,
})

export function useCreator() {
  return useContext(CreatorContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Get initial session with timeout
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000))

      Promise.race([sessionPromise, timeoutPromise])
        .then((result) => {
          if (result && typeof result === 'object' && 'data' in result) {
            const { data } = result as { data: { session: any } }
            setUser(data?.session?.user ?? null)
          }
          setLoading(false)
        })
        .catch((error) => {
          console.error('Error getting session:', error)
          setLoading(false)
        })

      // Listen for auth changes
      try {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
        })

        return () => {
          if (subscription) {
            subscription.unsubscribe()
          }
        }
      } catch (error) {
        console.error('Error setting up auth listener:', error)
        return () => {}
      }
    } catch (error) {
      console.error('Error initializing Supabase client:', error)
      setLoading(false)
    }
  }, [])

  return (
    <CreatorContext.Provider value={{ user, creatorProfile, loading }}>
      {children}
    </CreatorContext.Provider>
  )
}

