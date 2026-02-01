import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadForm } from '@/components/upload/upload-form'
import { getCurrentCreator } from '@/lib/db/creator'
import Link from 'next/link'

// Force dynamic rendering - this page uses searchParams
export const dynamic = 'force-dynamic'

export default async function UploadPage({
  searchParams,
}: {
  searchParams?: Promise<{ profile?: string }> | { profile?: string }
}) {
  // Handle searchParams (might be Promise in newer Next.js)
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  
  let creator = null
  try {
    creator = await getCurrentCreator(params?.profile)
  } catch (error: any) {
    console.error('[UploadPage] Error fetching creator:', error?.message || String(error))
  }

  if (!creator) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-white">Upload Content</h1>
          <p className="text-white/70 text-sm uppercase tracking-[0.4em]">
            Please complete your creator profile first.
          </p>
        </div>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg font-semibold mb-4 text-white/90">
                Complete your creator profile to start uploading content.
              </p>
              <Link href="/setup">
                <Button size="lg" className="bg-[#89CFF0] text-black hover:bg-[#89CFF0]/90">
                  Set Up Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold mb-2 text-white">Upload Content</h1>
        <p className="text-white/70 text-sm uppercase tracking-[0.4em]">
          Upload your video content to publish across platforms
        </p>
      </div>

      {/* Centralized Upload Section */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center">Upload Video</CardTitle>
            <CardDescription className="text-white/70 text-center">
              Upload your video content to schedule or publish immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm creatorUniqueIdentifier={creator.unique_identifier} />
          </CardContent>
        </Card>
      </div>

      {/* Upload Guidelines */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-white/70">
              <li>• Supported formats: MP4, MOV, AVI (max 500MB)</li>
              <li>• Recommended resolution: 1080p or higher</li>
              <li>• Add a compelling title and description for better performance</li>
              <li>• Select the target platform before scheduling</li>
              <li>• Thumbnails are automatically generated but can be customized</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

