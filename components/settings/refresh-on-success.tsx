'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Client component to refresh page when success parameter is present
 * This ensures the connections page shows updated status after OAuth
 */
export function RefreshOnSuccess({ success }: { success?: string | null }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (success) {
      // Wait a moment for any server-side updates, then refresh
      const timer = setTimeout(() => {
        router.refresh()
        // Also remove the success parameter from URL after refresh
        const url = new URL(window.location.href)
        url.searchParams.delete('success')
        window.history.replaceState({}, '', url.toString())
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [success, router, pathname])

  return null
}

