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
    // @ts-ignore - TypeScript incorrectly infers type as 'never' for Supabase queries
    return NextResponse.json({
      exists: true,
      video: {
        // @ts-ignore
        id: (videoData as any)?.id || '',
        // @ts-ignore
        title: (videoData as any)?.title || '',
        // @ts-ignore
        status: (videoData as any)?.status || '',
        // @ts-ignore
        creator_unique_identifier: (videoData as any)?.creator_unique_identifier || '',
        // @ts-ignore
        platform_target: (videoData as any)?.platform_target || '',
        // @ts-ignore
        created_at: (videoData as any)?.created_at || '',
        // @ts-ignore
        posted_at: (videoData as any)?.posted_at || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check video' },
      { status: 500 }
    )
  }
}


