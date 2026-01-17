import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Share2, Youtube, Instagram, Music } from 'lucide-react'
import { getCurrentCreator } from '@/lib/db/creator'
import { getProfiles } from '@/lib/ayrshare/api'
import { getAyrshareProfile, getOrCreateAyrshareProfile } from '@/lib/ayrshare/user'
import { createClient } from '@/lib/supabase/server'
import { ConnectAccountsButton } from '@/components/settings/connect-accounts-button'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }> | { success?: string; error?: string }
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  
  const creator = await getCurrentCreator()
  if (!creator) {
    redirect('/setup')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if Ayrshare API key is configured
  const hasAyrshareKey = !!process.env.AYRSHARE_API_KEY
  const ayrshareApiKey = process.env.AYRSHARE_API_KEY

  // Get or create user's Ayrshare profile
  let ayrshareProfile = null
  if (hasAyrshareKey && ayrshareApiKey) {
    try {
      ayrshareProfile = await getOrCreateAyrshareProfile(
        user.id,
        creator.unique_identifier,
        creator.display_name || creator.handles || 'User',
        user.email || undefined
      )
    } catch (error: any) {
      console.error('Error getting/creating Ayrshare profile:', error)
      // Continue - user can still connect accounts manually
    }
  }

  // Get connected profiles from Ayrshare for this user
  let profiles: any[] = []
  let hasProfiles = false
  if (hasAyrshareKey && ayrshareApiKey && ayrshareProfile) {
    try {
      profiles = await getProfiles(
        ayrshareApiKey,
        ayrshareProfile.ayrshare_profile_key || undefined
      )
      hasProfiles = profiles.length > 0
    } catch (error: any) {
      console.error('Error fetching Ayrshare profiles:', error)
      // If profileKey doesn't work, try without it (fallback to master key)
      try {
        profiles = await getProfiles(ayrshareApiKey)
        hasProfiles = profiles.length > 0
      } catch (e) {
        console.error('Error fetching profiles with master key:', e)
      }
    }
  }

  // Group profiles by platform
  const youtubeProfiles = profiles.filter(p => p.socialNetwork === 'youtube')
  const instagramProfiles = profiles.filter(p => p.socialNetwork === 'instagram')
  const tiktokProfiles = profiles.filter(p => p.socialNetwork === 'tiktok')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold mb-3">Platform Connections</h1>
        <p className="text-foreground/80 text-lg font-medium">
          Connect your social media accounts via Ayrshare to enable automated posting
        </p>
      </div>

      {/* Success/Error Messages */}
      {params?.success && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <p>
                {params.success === 'ayrshare_connected' && 'Ayrshare connected successfully!'}
                {params.success || 'Connection successful!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {params?.error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-400">
              <XCircle className="h-5 w-5" />
              <p>
                {params.error === 'api_key_not_configured' && 'Ayrshare API key not configured. Please add AYRSHARE_API_KEY to environment variables.'}
                {params.error || 'An error occurred. Please try again.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ayrshare Connection Card */}
      <Card className={hasAyrshareKey && hasProfiles ? 'border-green-500/30' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Ayrshare</CardTitle>
                <CardDescription>
                  Connect all your social media accounts in one place
                </CardDescription>
              </div>
            </div>
            {hasAyrshareKey && hasProfiles && (
              <Badge variant="success">Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasAyrshareKey ? (
            <div className="space-y-3">
              <p className="text-sm text-yellow-400">
                Ayrshare API key not configured. Please add AYRSHARE_API_KEY to your environment variables.
              </p>
            </div>
          ) : ayrshareProfile ? (
            <div className="space-y-4">
              <ConnectAccountsButton 
                creatorUniqueIdentifier={creator.unique_identifier}
                hasProfile={!!ayrshareProfile}
              />
              {hasProfiles && (
                <div>
                  <p className="text-sm text-foreground/70 mb-2">Connected Accounts:</p>
                  <div className="grid gap-3 md:grid-cols-3">
                  {/* YouTube */}
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-semibold">YouTube</span>
                    </div>
                    <p className="text-xs text-foreground/70">
                      {youtubeProfiles.length} account{youtubeProfiles.length !== 1 ? 's' : ''} connected
                    </p>
                  </div>

                  {/* Instagram */}
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      <span className="text-sm font-semibold">Instagram</span>
                    </div>
                    <p className="text-xs text-foreground/70">
                      {instagramProfiles.length} account{instagramProfiles.length !== 1 ? 's' : ''} connected
                    </p>
                  </div>

                  {/* TikTok */}
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="h-4 w-4" />
                      <span className="text-sm font-semibold">TikTok</span>
                    </div>
                    <p className="text-xs text-foreground/70">
                      {tiktokProfiles.length} account{tiktokProfiles.length !== 1 ? 's' : ''} connected
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Link href="https://www.ayrshare.com/dashboard" target="_blank">
                  <Button variant="outline" className="w-full">
                    Manage Accounts in Ayrshare Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground/70">
                Connect your social media accounts through Ayrshare to start posting.
              </p>
              <Link href="https://www.ayrshare.com/dashboard" target="_blank">
                <Button className="w-full bg-primary hover:bg-primary-dark">
                  Connect Accounts via Ayrshare
                </Button>
              </Link>
              <p className="text-xs text-foreground/50">
                You&apos;ll be redirected to Ayrshare to connect your YouTube, Instagram, TikTok, and other accounts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-foreground/70">
            <li>• Ayrshare is a unified social media API that handles all platform connections</li>
            <li>• Click &quot;Connect Accounts via Ayrshare&quot; to link your social media accounts</li>
            <li>• Once connected, you can post to YouTube, Instagram, TikTok, and more from one place</li>
            <li>• All OAuth complexity is handled by Ayrshare - no need to manage tokens yourself</li>
            <li>• Your accounts are securely connected through Ayrshare&apos;s platform</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

