# Fix Google Cloud OAuth Client Configuration

## The Issue

You're getting:
```
Request is missing required authentication credential. Expected OAuth 2 access token...
```

This usually means the **OAuth client type is wrong** or the **client credentials don't match**.

## OAuth Client Type Requirements

For YouTube API uploads via server-to-server (n8n), you need:

### ✅ **Web Application** Client Type

**NOT:**
- ❌ Desktop application
- ❌ iOS application  
- ❌ Android application
- ❌ Chrome extension

**MUST BE:**
- ✅ **Web application**

## How to Check/Update in Google Cloud Console

### Step 1: Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**

### Step 2: Check Your OAuth 2.0 Client

1. Find your OAuth 2.0 Client ID (the one matching `YOUTUBE_CLIENT_ID` in your env)
2. Click on it to edit
3. Check the **Application type**:
   - Should be: **Web application** ✅
   - If it's anything else, you need to create a new one

### Step 3: Configure Authorized Redirect URIs

For your app, add these redirect URIs:

**For Vercel:**
```
https://airpublisher.vercel.app/api/auth/youtube/callback
```

**For local development:**
```
http://localhost:3000/api/auth/youtube/callback
```

**For your server (if using):**
```
http://93.127.216.83:3003/api/auth/youtube/callback
```

### Step 4: Verify Client ID and Secret Match

1. **Client ID** should match `YOUTUBE_CLIENT_ID` in your environment variables
2. **Client Secret** should match `YOUTUBE_CLIENT_SECRET` in your environment variables
3. Both should be from the **same OAuth client**

## If You Need to Create a New OAuth Client

### Option 1: Create New Web Application Client

1. In Google Cloud Console → **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type:** Select **Web application**
4. **Name:** `AIR Publisher YouTube OAuth`
5. **Authorized redirect URIs:** Add all your callback URLs (see Step 3 above)
6. Click **CREATE**
7. Copy the **Client ID** and **Client Secret**
8. Update your environment variables:
   - `YOUTUBE_CLIENT_ID` = new Client ID
   - `YOUTUBE_CLIENT_SECRET` = new Client Secret

### Option 2: Keep Existing Client (If It's Already Web Application)

If your existing client is already "Web application" type:
1. Just verify the redirect URIs are correct
2. Make sure you're using the right Client ID/Secret in your env vars
3. **Reconnect YouTube** in your app to get a new token with the correct client

## Why This Matters

Different OAuth client types issue tokens with different formats/restrictions:

- **Web application** tokens work for server-to-server API calls ✅
- **Desktop** tokens might not work for YouTube API uploads ❌
- **Mobile** tokens definitely won't work for server-side API calls ❌

## After Updating

1. **Update environment variables** in Vercel/server with new Client ID/Secret
2. **Disconnect YouTube** in your app settings
3. **Reconnect YouTube** - this will get a new token with the correct client
4. **Test the upload** again

## Verify Token is Valid

After reconnecting, test the token:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"
```

Should return your channel info if token is valid.

## Common Mistakes

### ❌ Using Desktop Client for Server-Side
- Desktop clients are for installed apps
- Won't work for server-to-server API calls

### ❌ Wrong Redirect URI
- Must match exactly (including http vs https)
- Must include the full path: `/api/auth/youtube/callback`

### ❌ Client ID/Secret Mismatch
- Token was issued with one client
- But refresh is using different client credentials
- Solution: Reconnect to get new token with matching client

## Quick Checklist

- [ ] OAuth client type is **Web application**
- [ ] Redirect URIs are configured correctly
- [ ] `YOUTUBE_CLIENT_ID` matches the Client ID in Google Cloud
- [ ] `YOUTUBE_CLIENT_SECRET` matches the Client Secret in Google Cloud
- [ ] YouTube Data API v3 is enabled
- [ ] OAuth consent screen is configured
- [ ] Reconnected YouTube after updating client (to get new token)

## Still Not Working?

1. **Check token in database:**
   - Look at `youtube_tokens` table
   - Verify `google_access_token` exists and looks valid (starts with `ya29.`)

2. **Test token directly:**
   - Use the token in a curl/Postman request to YouTube API
   - If it fails, the token itself is invalid (not a client issue)

3. **Check token refresh:**
   - The `/api/n8n/video-details` endpoint auto-refreshes tokens
   - Check logs to see if refresh is succeeding
   - If refresh fails, the Client ID/Secret might be wrong

