'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createProfileAction } from '@/app/api/profile/actions'
import { createClient } from '@/lib/supabase/client'

export function SetupForm() {
  const [displayName, setDisplayName] = useState('')
  const [niche, setNiche] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Get user ID from client-side session (workaround for server-side session detection issues)
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          console.log('[SetupForm] Got user ID from client:', user.id)
        }
      } catch (e) {
        console.warn('[SetupForm] Could not get user ID:', e)
      }
    }
    getUser()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Use API route instead of server action (handles cookies better)
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName || null,
          niche: niche || null,
          avatar_url: avatarUrl || null,
          user_id: userId || null, // Pass user ID from client as fallback
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile')
      }

      const profile = data.profile
      console.log('Profile created:', profile)

      // Store the unique_identifier in localStorage for client-side use
      if (profile?.unique_identifier) {
        localStorage.setItem('creator_unique_identifier', profile.unique_identifier)
        console.log('✅ Profile created with unique_identifier:', profile.unique_identifier)
        console.log('✅ Redirecting to dashboard with profile param')
        // Use a small delay to ensure cookie is set
        setTimeout(() => {
          window.location.href = `/dashboard?profile=${encodeURIComponent(profile.unique_identifier)}`
        }, 100)
      } else {
        console.warn('⚠️ Profile created but no unique_identifier returned')
        // Fallback: just redirect
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
    } catch (err: any) {
      console.error('Profile creation error:', err)
      const errorMessage = err?.message || 'Failed to create profile. Please try again.'
      
      // Provide helpful error message
      if (errorMessage.includes('RLS') || errorMessage.includes('policy')) {
        setError(
          'Database permission error. Please ensure RLS policies are set up correctly. ' +
          'Check the migration file: supabase/migrations/002_add_creator_profiles_rls.sql'
        )
      } else {
        setError(errorMessage)
      }
      setLoading(false)
    }
  }

  const popularNiches = [
    'Fitness',
    'Business',
    'Technology',
    'Education',
    'Entertainment',
    'Lifestyle',
    'Gaming',
    'Finance',
    'Health',
    'Travel',
    'Food',
    'Music',
    'Art',
    'Sports',
    'Other',
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">
          Display Name <span className="text-foreground/50">(optional)</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Your creator name"
        />
        <p className="text-xs text-foreground/50 mt-1">
          This will be shown on your profile and leaderboards
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Niche <span className="text-foreground/50">(optional)</span>
        </label>
        <select
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select a niche</option>
          {popularNiches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="text-xs text-foreground/50 mt-1">
          Your content category
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Profile Picture URL <span className="text-foreground/50">(optional)</span>
        </label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://example.com/avatar.jpg"
        />
        <p className="text-xs text-foreground/50 mt-1">
          Link to your profile picture
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={loading}
        >
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Skip for Now
        </Button>
      </div>
    </form>
  )
}

