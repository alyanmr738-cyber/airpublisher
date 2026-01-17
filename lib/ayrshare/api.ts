/**
 * Ayrshare API Client
 * Unified social media API for posting to YouTube, Instagram, TikTok, and more
 * Documentation: https://www.ayrshare.com/docs/apis/overview
 */

const AYRSHARE_API_BASE = 'https://api.ayrshare.com/api'

export interface AyrshareProfile {
  id: string
  profileKey: string
  profileName: string
  profileType: 'user' | 'page' | 'group' | 'channel'
  profilePic: string
  socialNetwork: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin' | 'pinterest' | 'bluesky' | 'threads' | 'snapchat' | 'telegram' | 'reddit' | 'google'
  socialId: string
  socialUsername: string
  isActive: boolean
  isConnected: boolean
}

export interface CreatePostParams {
  post: string // Post text/caption
  platforms: string[] // e.g., ['youtube', 'instagram', 'tiktok']
  mediaUrls?: string[] // URLs to images/videos
  media?: string[] // Alternative media format
  scheduleDate?: string // ISO 8601 format: '2026-01-20T12:00:00Z'
  shortenLinks?: boolean
  autoHashtags?: boolean
  autoSchedule?: boolean
}

export interface AyrsharePost {
  id: string // Ayrshare post ID
  postIds: {
    [platform: string]: string // Platform-specific post IDs
  }
  status: 'success' | 'pending' | 'failed'
  platforms: string[]
  post: string
  mediaUrls?: string[]
  scheduleDate?: string
  createdAt: string
}

export interface PostAnalytics {
  id: string
  postIds: {
    [platform: string]: string
  }
  analytics: {
    [platform: string]: {
      likes?: number
      comments?: number
      shares?: number
      views?: number
      engagement?: number
      reach?: number
      impressions?: number
    }
  }
}

/**
 * Make authenticated request to Ayrshare API
 * @param endpoint - API endpoint (e.g., '/post', '/profiles')
 * @param apiKey - Ayrshare API key (passed as parameter for flexibility)
 * @param options - Fetch options
 */
async function ayrshareRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  if (!apiKey) {
    throw new Error('Ayrshare API key is required')
  }

  const url = `${AYRSHARE_API_BASE}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Ayrshare API error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Get connected social media profiles for a user
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan)
 */
export async function getProfiles(apiKey: string, profileKey?: string): Promise<AyrshareProfile[]> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  const data = await ayrshareRequest<{ profiles: AyrshareProfile[] }>('/profiles', apiKey, profileKey)
  return data.profiles || []
}

/**
 * Get a specific profile by ID
 * @param profileId - Ayrshare profile ID
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan)
 */
export async function getProfile(
  profileId: string,
  apiKey: string,
  profileKey?: string
): Promise<AyrshareProfile> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  return ayrshareRequest<AyrshareProfile>(`/profiles/${profileId}`, apiKey, profileKey)
}

/**
 * Create a post across multiple platforms
 * @param params - Post parameters
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan multi-user)
 */
export async function createPost(
  params: CreatePostParams,
  apiKey: string,
  profileKey?: string
): Promise<AyrsharePost> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  const payload: any = {
    post: params.post,
    platforms: params.platforms,
  }

  if (params.mediaUrls && params.mediaUrls.length > 0) {
    payload.mediaUrls = params.mediaUrls
  }

  if (params.media && params.media.length > 0) {
    payload.media = params.media
  }

  if (params.scheduleDate) {
    payload.scheduleDate = params.scheduleDate
  }

  if (params.shortenLinks !== undefined) {
    payload.shortenLinks = params.shortenLinks
  }

  if (params.autoHashtags !== undefined) {
    payload.autoHashtags = params.autoHashtags
  }

  if (params.autoSchedule !== undefined) {
    payload.autoSchedule = params.autoSchedule
  }

  // Build headers with optional Profile-Key for Business Plan
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  
  if (profileKey) {
    headers['Profile-Key'] = profileKey
  }

  const response = await fetch(`${AYRSHARE_API_BASE}/post`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Ayrshare API error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Get post analytics
 * @param postId - Ayrshare post ID
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan)
 */
export async function getPostAnalytics(
  postId: string,
  apiKey: string,
  profileKey?: string
): Promise<PostAnalytics> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  return ayrshareRequest<PostAnalytics>(`/analytics/post/${postId}`, apiKey, profileKey)
}

/**
 * Delete a post
 * @param postId - Ayrshare post ID
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan)
 */
export async function deletePost(
  postId: string,
  apiKey: string,
  profileKey?: string
): Promise<{ success: boolean }> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  return ayrshareRequest<{ success: boolean }>(`/post/${postId}`, apiKey, profileKey, {
    method: 'DELETE',
  })
}

/**
 * Get post history
 * @param apiKey - Ayrshare API key (master key, required)
 * @param profileKey - User's profile key (optional, for Business Plan)
 */
export async function getPostHistory(
  apiKey: string,
  profileKey?: string,
  limit: number = 50,
  offset: number = 0
): Promise<AyrsharePost[]> {
  if (!apiKey) {
    throw new Error('AYRSHARE_API_KEY is required')
  }
  const data = await ayrshareRequest<{ history: AyrsharePost[] }>(
    `/history?limit=${limit}&offset=${offset}`,
    apiKey,
    profileKey
  )
  return data.history || []
}

/**
 * Validate API key
 * @param apiKey - Ayrshare API key (required)
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await getProfiles(apiKey)
    return true
  } catch {
    return false
  }
}

