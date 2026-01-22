import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

// Force dynamic rendering - this route uses dynamic params
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check video status
 * Only works in development mode
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const videoId = resolvedParams.id

    const supabase = await createClient()
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get video with regular client (respects RLS)
    const { data: regularVideo, error: regularError } = await supabase
      .from('air_publisher_videos')
      .select('id, title, status, posted_at, created_at, video_url, thumbnail_url, views')
      .eq('id', videoId)
      .single()

    // Get video with service role (bypasses RLS)
    const { data: serviceVideo, error: serviceError } = await serviceClient
      .from('air_publisher_videos')
      .select('id, title, status, posted_at, created_at, video_url, thumbnail_url, views')
      .eq('id', videoId)
      .single()

    return NextResponse.json({
      videoId,
      regularClient: {
        video: regularVideo || null,
        error: regularError?.message || null,
        errorCode: regularError?.code || null,
      },
      serviceClient: {
        video: serviceVideo || null,
        error: serviceError?.message || null,
        errorCode: serviceError?.code || null,
      },
      note: 'Check if status is "posted" and posted_at is set. If regularClient is null but serviceClient has data, RLS is blocking.',
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

