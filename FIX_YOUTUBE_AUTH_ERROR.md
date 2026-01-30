# Fix YouTube Authentication Error

## Error Message
```
Authorization failed - please check your credentials
Request is missing required authentication credential. Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

## Common Causes

### 1. ❌ Token Missing Required Scopes

YouTube upload requires these scopes:
- `https://www.googleapis.com/auth/youtube.upload` (required for uploading)
- `https://www.googleapis.com/auth/youtube` (required for managing videos)

**Check:** When you connected YouTube, did the OAuth flow request these scopes?

### 2. ❌ Token Field Name Mismatch

The `/api/n8n/video-details` endpoint returns tokens in this format:
```json
{
  "platform_tokens": {
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

But in your n8n workflow, you might be using:
- `{{ $json.google_access_token }}` ❌ (wrong field name)
- Should be: `{{ $json.platform_tokens.access_token }}` ✅

### 3. ❌ Token Not Refreshed

Even if the token looks valid, it might be expired. The `/api/n8n/video-details` endpoint should auto-refresh it, but check:
- Is the refresh token valid?
- Did the refresh succeed?

### 4. ❌ YouTube API Not Enabled

Check Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Enabled APIs**
4. Ensure **YouTube Data API v3** is enabled

## How to Fix

### Step 1: Check Token in n8n

Add a **Code Node** after "Get Video Details" to log the token structure:

```javascript
const data = $input.item.json;

console.log('Full response:', JSON.stringify(data, null, 2));
console.log('Platform tokens:', data.platform_tokens);
console.log('Access token:', data.platform_tokens?.access_token);

return {
  json: {
    ...data,
    // Make token easily accessible
    google_access_token: data.platform_tokens?.access_token,
  }
};
```

### Step 2: Fix Authorization Header

In your HTTP Request node, use the correct token path:

**If using the Code node above:**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Code').item.json.google_access_token }}"
}
```

**Or directly from video-details response:**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}"
}
```

### Step 3: Verify Token Has Correct Scopes

Test the token by calling YouTube API directly:

**Add a test HTTP Request node:**
- **Method:** GET
- **URL:** `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`
- **Headers:**
  - `Authorization`: `Bearer {{ $json.google_access_token }}`

If this fails, the token doesn't have the right scopes or is invalid.

### Step 4: Reconnect YouTube Account

If token is invalid or missing scopes:

1. Go to your app's settings/connections page
2. Disconnect YouTube
3. Reconnect YouTube (this will request the correct scopes)
4. Make sure the OAuth flow requests:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`

## Correct n8n Workflow Structure

```
Webhook
  ↓
Respond to Webhook
  ↓
HTTP Request: Get Video Details
  ↓
Code Node: Extract & Log Token (optional but helpful)
  ↓
HTTP Request: Initiate YouTube Upload
  - Header: Authorization: Bearer {{ $('Code').item.json.google_access_token }}
```

## Debugging Steps

1. **Check video-details response:**
   - Add a Code node after "Get Video Details"
   - Log: `$input.item.json.platform_tokens`
   - Verify `access_token` exists

2. **Test token validity:**
   - Use the token in a test HTTP Request to YouTube API
   - If it fails, token is invalid/expired

3. **Check token scopes:**
   - Decode the JWT token (if it's a JWT) at [jwt.io](https://jwt.io)
   - Look for `scope` field
   - Should include `https://www.googleapis.com/auth/youtube.upload`

4. **Verify YouTube API is enabled:**
   - Google Cloud Console → APIs & Services → Enabled APIs
   - YouTube Data API v3 must be enabled

## Quick Fix: Update Your HTTP Request Node

**Current (probably wrong):**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.google_access_token }}"
}
```

**Fixed (if using video-details response directly):**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}"
}
```

**Or add a Set/Code node to normalize:**
```javascript
// Code node after "Get Video Details"
return {
  json: {
    ...$input.item.json,
    google_access_token: $input.item.json.platform_tokens?.access_token,
  }
};
```

Then use:
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.google_access_token }}"
}
```

## Most Likely Issue

Based on your error, the most likely issue is:
1. **Token field path is wrong** - You're using `$json.google_access_token` but it should be `$json.platform_tokens.access_token`
2. **Token doesn't have upload scope** - The OAuth connection didn't request `youtube.upload` scope

Fix the token path first, then if it still fails, reconnect YouTube with the correct scopes.

