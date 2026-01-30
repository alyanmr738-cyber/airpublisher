# Debug YouTube Token Path in n8n

Since API is enabled, token is new, and scopes are correct, the issue is likely the **token path** in your n8n workflow.

## Step 1: Check What You're Actually Getting

Add a **Code Node** right after your "Get Video Details" HTTP Request node:

**Code Node Settings:**
```javascript
// Log the entire response to see the structure
const response = $input.item.json;

console.log('=== FULL RESPONSE ===');
console.log(JSON.stringify(response, null, 2));

console.log('=== PLATFORM TOKENS ===');
console.log(JSON.stringify(response.platform_tokens, null, 2));

console.log('=== ACCESS TOKEN ===');
console.log('Token exists:', !!response.platform_tokens?.access_token);
console.log('Token preview:', response.platform_tokens?.access_token?.substring(0, 20) + '...');

// Return the data with normalized token path
return {
  json: {
    ...response,
    // Make token easily accessible
    google_access_token: response.platform_tokens?.access_token,
    video: response.video,
    platform_tokens: response.platform_tokens,
  }
};
```

**Run this node** and check the execution logs. You should see:
- The full response structure
- Whether `platform_tokens.access_token` exists
- A preview of the token

## Step 2: Fix Your HTTP Request Node

Based on the response structure from `/api/n8n/video-details`, the token is at:

```
{{ $('Get Video Details').item.json.platform_tokens.access_token }}
```

**In your HTTP Request node for YouTube upload, use:**

```json
{
  "method": "POST",
  "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**Replace `Get Video Details` with your actual node name.**

## Step 3: If Using Code Node Above

If you added the Code node from Step 1, you can use:

```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Code').item.json.google_access_token }}"
}
```

## Step 4: Test Token Directly

Add a **test HTTP Request node** to verify the token works:

**Test Node:**
- **Method:** GET
- **URL:** `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`
- **Headers:**
  - `Authorization`: `Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}`

**Expected Response:**
- **Status:** 200 OK
- **Body:** Your YouTube channel info

If this fails, the token path is wrong or the token itself is invalid.

## Common Mistakes

### ❌ Wrong: Using `$json.google_access_token`
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.google_access_token }}"
}
```
**Problem:** This field doesn't exist in the response.

### ✅ Correct: Using `platform_tokens.access_token`
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}"
}
```

### ❌ Wrong: Missing node reference
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.platform_tokens.access_token }}"
}
```
**Problem:** `$json` refers to the current node's input, not the "Get Video Details" node.

### ✅ Correct: Referencing the correct node
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $('Get Video Details').item.json.platform_tokens.access_token }}"
}
```

## Expected Response Structure from `/api/n8n/video-details`

```json
{
  "success": true,
  "video": {
    "id": "...",
    "title": "...",
    "description": "...",
    "video_url": "...",
    "thumbnail_url": "...",
    "platform_target": "youtube",
    "creator_unique_identifier": "..."
  },
  "platform_tokens": {
    "access_token": "ya29.a0AfH6SMC...",  // ← THIS IS YOUR TOKEN
    "refresh_token": "...",
    "channel_id": "...",
    "channel_title": "..."
  },
  "has_tokens": true
}
```

## Quick Fix Workflow

1. **Add Code Node** after "Get Video Details" (from Step 1)
2. **Update HTTP Request node** Authorization header to:
   ```
   Bearer {{ $('Code').item.json.google_access_token }}
   ```
3. **Test** - Should work now!

## Still Not Working?

If the token path is correct but you still get auth errors:

1. **Check token in logs:**
   - Look at the Code node output
   - Verify token starts with `ya29.` or `1//` (Google token format)

2. **Verify token is fresh:**
   - The `/api/n8n/video-details` endpoint auto-refreshes tokens
   - Check the execution logs for refresh messages

3. **Test token manually:**
   - Copy the token from logs
   - Test in Postman/curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"
   ```

4. **Check OAuth consent:**
   - Go to Google Cloud Console
   - APIs & Services → OAuth consent screen
   - Verify your app is in "Testing" or "Published" state
   - Check if your user email is in test users (if in Testing mode)

