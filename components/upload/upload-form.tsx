'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload as UploadIcon, X } from 'lucide-react'
import { createVideoAction } from '@/app/api/videos/actions'

interface UploadFormProps {
  creatorUniqueIdentifier: string
}

export function UploadForm({ creatorUniqueIdentifier }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | 'tiktok' | 'internal'>('youtube')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Create preview URL
      const url = URL.createObjectURL(selectedFile)
      setPreview(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    try {
      // Create video entry - if platform is 'internal', auto-publish it
      // Otherwise, create as 'draft' to be scheduled/posted later
      const shouldAutoPublish = platform === 'internal'
      
      console.log('[UploadForm] Creating video record...', {
        platform,
        shouldAutoPublish,
      })
      
      const video = await createVideoAction({
        creator_unique_identifier: creatorUniqueIdentifier,
        source_type: 'ugc',
        title,
        description: description || null,
        platform_target: platform,
        status: shouldAutoPublish ? 'posted' : 'draft',
        posted_at: shouldAutoPublish ? new Date().toISOString() : null,
      })

      console.log('[UploadForm] ✅ Video record created:', {
        id: video.id,
        title: video.title,
        status: video.status,
      })

      if (!video.id) {
        throw new Error('Video was created but no ID was returned')
      }

      // Upload file to Supabase Storage
      if (file && video.id) {
        console.log('[UploadForm] Uploading file to Supabase Storage...', {
          videoId: video.id,
          fileName: file.name,
          fileSize: file.size,
        })
        
        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await fetch(`/api/videos/${video.id}/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error('[UploadForm] Upload error:', errorData)
          throw new Error(errorData.error || `Failed to upload file: ${uploadResponse.statusText}`)
        }

        const uploadResult = await uploadResponse.json()
        console.log('[UploadForm] ✅ File uploaded successfully:', uploadResult.video_url)
      } else {
        console.warn('[UploadForm] Skipping file upload - no file or video ID')
      }

      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setPreview(null)
      
      // Show success message based on status
      if (!video || !video.id) {
        throw new Error('Video was created but no ID was returned. Check server logs.')
      }

      if (video.status === 'posted') {
        alert(`Video uploaded and published successfully! 🎉\n\nVideo ID: ${video.id}\nIt's now live on the Discover page!`)
      } else {
        alert(`Video uploaded successfully! ✅\n\nVideo ID: ${video.id}\nStatus: ${video.status}\nGo to "My Videos" to schedule or publish it.`)
      }
      
      // Refresh the page or redirect to videos page to see the video
      setTimeout(() => {
        window.location.href = '/videos'
      }, 2000)
    } catch (error: any) {
      console.error('Upload error:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause,
      })
      
      // Show detailed error
      const errorMessage = error?.message || 'Unknown error'
      alert(`Failed to upload video:\n${errorMessage}\n\nCheck browser console for details.`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Video File</label>
        {preview ? (
          <div className="relative">
            <video
              src={preview}
              className="w-full h-48 object-cover rounded-lg border border-border"
              controls
            />
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-card-hover transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon className="w-10 h-10 mb-3 text-foreground/50" />
              <p className="mb-2 text-sm text-foreground/70">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-foreground/50">MP4, MOV, AVI (MAX. 500MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter video title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          placeholder="Enter video description"
        />
      </div>

      {/* Platform */}
      <div>
        <label className="block text-sm font-medium mb-2">Target Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as any)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="internal">Internal (AIR Platform)</option>
        </select>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={uploading || !file || !title}>
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </form>
  )
}

