import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

/**
 * Debug endpoint to check if a video exists in the database
 * Uses service role to bypass RLS
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const videoId = resolvedParams.id

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if video exists - use explicit any casting to bypass TypeScript type checking
    const result: any = await (serviceClient
      .from('air_publisher_videos') as any)
      .select('*')
      .eq('id', videoId)
      .maybeSingle()

    const videoData: any = result?.data
    const error: any = result?.error

    if (error) {
      return NextResponse.json({
        exists: false,
        error: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
      })
    }

    if (!videoData) {
      return NextResponse.json({
        exists: false,
        message: 'Video not found in database',
        videoId,
      })
    }

    // Use videoData directly with explicit any casting for each property
    return NextResponse.json({
      exists: true,
      video: {
        id: videoData?.id || '',
        title: videoData?.title || '',
        status: videoData?.status || '',
        creator_unique_identifier: videoData?.creator_unique_identifier || '',
        platform_target: videoData?.platform_target || '',
        created_at: videoData?.created_at || '',
        posted_at: videoData?.posted_at || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check video' },
      { status: 500 }
    )
  }
}


