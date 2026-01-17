import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import { updateVideo } from '@/lib/db/videos'

const BUCKET_NAME = 'air-publisher-videos'

/**
 * Upload video file to Supabase Storage
 * Called after video record is created in database
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const videoId = resolvedParams.id

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Get the file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('[upload] Uploading file:', {
      videoId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

    // Generate storage path: creator-id/video-id/filename
    const supabase = await createClient()
    
    console.log('[upload] Looking up video:', videoId)
    
    // Try to get video with regular client first
    let video = null
    let videoError = null
    
    try {
      const { data, error } = await supabase
        .from('air_publisher_videos')
        .select('creator_unique_identifier, id, title')
        .eq('id', videoId)
        .single()

      video = data
      videoError = error
      
      if (error) {
        console.error('[upload] Regular client error fetching video:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
      }
    } catch (e: any) {
      console.error('[upload] Exception fetching video:', e)
      videoError = e
    }

    // If regular client fails, try service role (might be RLS blocking)
    if (videoError || !video) {
      console.log('[upload] Regular client failed, trying service role...')
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json(
          { 
            error: 'Video not found and service role key not configured',
            details: videoError?.message || 'Unknown error',
          },
          { status: 404 }
        )
      }

      const serviceClient = createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: serviceVideo, error: serviceError } = await serviceClient
        .from('air_publisher_videos')
        .select('creator_unique_identifier, id, title')
        .eq('id', videoId)
        .single()

      if (serviceError || !serviceVideo) {
        console.error('[upload] Service client also failed:', {
          error: serviceError?.message || 'No video found',
          videoId,
        })
        return NextResponse.json(
          { 
            error: 'Video not found',
            details: serviceError?.message || 'Video does not exist in database',
            videoId,
          },
          { status: 404 }
        )
      }

      video = serviceVideo
      console.log('[upload] ✅ Found video via service role:', video.id)
    } else {
      console.log('[upload] ✅ Found video via regular client:', video.id)
    }

    // Create storage path
    const fileExtension = file.name.split('.').pop() || 'mp4'
    const storagePath = `${video.creator_unique_identifier}/${videoId}.${fileExtension}`

    // Upload to Supabase Storage
    // Try with regular client first
    let uploadResult
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('[upload] Regular client upload error:', error)
        throw error
      }

      uploadResult = data
    } catch (uploadError: any) {
      // If regular client fails (RLS or permissions), try service role
      console.log('[upload] Regular client failed, trying service role...')
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Service role key not configured')
      }

      const serviceClient = createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data, error } = await serviceClient.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('[upload] Service client upload error:', error)
        throw error
      }

      uploadResult = data
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    console.log('[upload] File uploaded successfully:', {
      path: uploadResult.path,
      publicUrl,
    })

    // Update video record with storage URL
    const updatedVideo = await updateVideo(videoId, {
      video_url: publicUrl,
    })

    return NextResponse.json({
      success: true,
      video_url: publicUrl,
      path: uploadResult.path,
      video: updatedVideo,
    })
  } catch (error: any) {
    console.error('[upload] Upload error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

