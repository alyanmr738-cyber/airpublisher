'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { publishVideoAction } from '@/app/api/videos/actions'
import { useRouter } from 'next/navigation'

interface PublishVideoButtonProps {
  videoId: string
}

export function PublishVideoButton({ videoId }: PublishVideoButtonProps) {
  const [publishing, setPublishing] = useState(false)
  const router = useRouter()

  const handlePublish = async () => {
    if (!confirm('Publish this video? It will be visible on the Discover page.')) {
      return
    }

    console.log('[PublishVideoButton] Starting publish for video:', videoId)
    setPublishing(true)
    try {
      console.log('[PublishVideoButton] Calling publishVideoAction...')
      const result = await publishVideoAction(videoId)
      console.log('[PublishVideoButton] ✅ Publish action completed:', result)
      router.refresh() // Refresh the page to show updated status
      alert('Video published successfully!')
    } catch (error: any) {
      console.error('[PublishVideoButton] ❌ Publish error:', error)
      console.error('[PublishVideoButton] Error details:', {
        message: error?.message,
        stack: error?.stack,
      })
      alert(`Failed to publish video: ${error.message || 'Unknown error'}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Button
      onClick={handlePublish}
      disabled={publishing}
      variant="outline"
      size="sm"
    >
      {publishing ? 'Publishing...' : 'Publish Video'}
    </Button>
  )
}

