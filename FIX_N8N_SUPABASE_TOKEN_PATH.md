# Fix n8n Token Path for Supabase Direct Query

Since you're fetching tokens directly from Supabase, the token structure is different.

## Supabase Response Structure

```json
[
  {
    "google_access_token": "ya29.a0AUMWg...",
    "google_refresh_token": "1//05IZXYxE...",
    "scope": "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
    "expires_at": "2026-01-30T04:39:26.314+00:00",
    ...
  }
]
```

## Fix Your n8n HTTP Request Node

### Option 1: If Supabase Query is the Previous Node

In your YouTube upload HTTP Request node:

```json
{
  "method": "POST",
  "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $json.google_access_token }}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

### Option 2: If Supabase Query is a Different Node

If your Supabase query node is named "Get YouTube Tokens", use:

```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Get YouTube Tokens').item.json.google_access_token }}"
}
```

Replace `Get YouTube Tokens` with your actual Supabase node name.

## Important Notes

### 1. Supabase Returns an Array

If Supabase returns an array `[{...}]`, you need to access the first item:

```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json[0].google_access_token }}"
}
```

Or use a **Split In Batches** or **Item Lists** node to process each item.

### 2. Check Token Expiration

Your token expires at `2026-01-30T04:39:26.314+00:00`. 

**Before using the token, check if it's expired:**

Add a **Code Node** after Supabase query:

```javascript
const tokenData = $input.item.json[0] || $input.item.json; // Handle array or object
const expiresAt = new Date(tokenData.expires_at);
const now = new Date();
const isExpired = expiresAt < now;

console.log('Token expiration check:', {
  expiresAt: expiresAt.toISOString(),
  now: now.toISOString(),
  isExpired: isExpired,
  tokenPreview: tokenData.google_access_token?.substring(0, 30) + '...',
});

if (isExpired) {
  console.warn('⚠️ Token is expired! Need to refresh.');
  // You might want to refresh the token here or call /api/n8n/video-details
  // which auto-refreshes tokens
}

return {
  json: {
    ...tokenData,
    google_access_token: tokenData.google_access_token,
    is_expired: isExpired,
    needs_refresh: isExpired,
  }
};
```

### 3. Refresh Token if Expired

If the token is expired, you have two options:

**Option A: Use `/api/n8n/video-details` endpoint** (Recommended)
- This endpoint auto-refreshes tokens
- Returns token in `platform_tokens.access_token` format

**Option B: Refresh manually in n8n**
- Use the `google_refresh_token` to get a new access token
- Call `https://oauth2.googleapis.com/token` with refresh token

## Recommended: Use `/api/n8n/video-details` Instead

Instead of querying Supabase directly, use the `/api/n8n/video-details` endpoint:

**HTTP Request Node:**
- **Method:** GET
- **URL:** `https://airpublisher.vercel.app/api/n8n/video-details?video_id={{ $json.video_id }}`
- **Headers:**
  - `x-n8n-api-key`: `{{ $env.N8N_API_KEY }}`

**Benefits:**
- ✅ Auto-refreshes expired tokens
- ✅ Returns normalized token structure
- ✅ Includes video details too
- ✅ Handles token refresh automatically

**Then use:**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.platform_tokens.access_token }}"
}
```

## Quick Fix for Your Current Setup

If you want to keep using Supabase directly:

1. **Add Code Node** after Supabase query:
```javascript
const data = $input.item.json;
const tokenData = Array.isArray(data) ? data[0] : data;

return {
  json: {
    ...tokenData,
    google_access_token: tokenData.google_access_token,
  }
};
```

2. **Use in HTTP Request:**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Code').item.json.google_access_token }}"
}
```

3. **Check expiration** - If token is expired, refresh it or use `/api/n8n/video-details` instead.

## Your Token Looks Valid

Your token:
- ✅ Starts with `ya29.` (correct format)
- ✅ Has all required scopes
- ✅ Has refresh token
- ⚠️ Expires at `2026-01-30T04:39:26` - check if it's still valid

The issue is likely just the **token path** in your n8n Authorization header.

