'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

interface RefreshOnSuccessProps {
  success?: string
}

export function RefreshOnSuccess({ success }: RefreshOnSuccessProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (success === 'true') {
      // Clear the success parameter after showing the message
      const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('success')
        router.replace(`?${params.toString()}`)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [success, router, searchParams])

  if (success === 'true') {
    return (
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <p className="text-sm text-green-400 font-semibold">
            Connection updated successfully!
          </p>
        </div>
      </div>
    )
  }

  return null
}
