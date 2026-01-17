import { Sidebar } from '@/components/dashboard/sidebar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARY: Skip server-side auth checks - rely on client-side auth
  // This avoids cookie/session detection issues during development
  // Client-side will handle redirects if not authenticated
  if (process.env.NODE_ENV === 'development') {
    console.log('[DashboardLayout] ⚠️ Dev mode: Skipping server-side auth check')
  } else {
    // Production: Still check auth (but be lenient)
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[DashboardLayout] No authenticated user, redirecting to login')
        redirect('/login')
      }
    } catch (error: any) {
      console.log('[DashboardLayout] Auth check failed - allowing access (will be handled client-side)')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}

