import { Sidebar } from '@/components/dashboard/sidebar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check auth - be lenient to avoid cookie/session detection issues
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('[DashboardLayout] Auth check error (non-blocking):', error.message)
      // Don't redirect on error - let client-side handle it
    } else if (!user) {
      console.log('[DashboardLayout] No authenticated user, redirecting to login')
      redirect('/login')
    }
  } catch (error: any) {
    console.log('[DashboardLayout] Auth check exception - allowing access (will be handled client-side):', error.message)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  )
}

