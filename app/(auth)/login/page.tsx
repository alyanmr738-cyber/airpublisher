'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Pre-fill email from URL or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const emailParam = urlParams.get('email')
      const messageParam = urlParams.get('message')
      const storedEmail = localStorage.getItem('prefill_email')
      
      if (emailParam) {
        setEmail(emailParam)
        localStorage.removeItem('prefill_email')
      } else if (storedEmail) {
        setEmail(storedEmail)
      }

      // Show success message if present (e.g., from signup)
      if (messageParam) {
        setError(null) // Clear any existing error
        setSuccessMessage(decodeURIComponent(messageParam))
      }
    }
  }, [])

  // Debug: Check if Supabase is configured
  if (typeof window !== 'undefined') {
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted!')
    setLoading(true)
    setError(null)

    console.log('Email:', email)
    console.log('Password length:', password.length)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    try {
      console.log('Calling signInWithPassword...')
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      console.log('Full result:', JSON.stringify(result, null, 2))

      if (result.error) {
        console.error('Sign in error:', result.error)
        setError(result.error.message)
        setLoading(false)
        return
      }

      if (result.data?.user) {
        console.log('User signed in successfully:', result.data.user.id)
        console.log('Session exists:', !!result.data.session)
        
        // Wait a moment for session to be set in cookies
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Verify session is available before redirecting
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Session confirmed, redirecting to dashboard...')
          window.location.href = '/dashboard'
        } else {
          console.warn('Session not available yet, waiting...')
          // Try one more time after a longer delay
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession) {
            console.log('Session confirmed on retry, redirecting...')
            window.location.href = '/dashboard'
          } else {
            console.error('Session still not available')
            setError('Sign in successful but session not available. Please try again.')
            setLoading(false)
          }
        }
      } else {
        console.error('No user in response')
        setError('Sign in failed. Invalid credentials or account not confirmed.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Exception during sign in:', err)
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Sign In</CardTitle>
          <CardDescription>
            Sign in to your AIR Publisher account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              console.log('Form onSubmit triggered!')
              handleSignIn(e)
            }} 
            className="space-y-4"
          >
            {successMessage && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-400">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-foreground/70">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

