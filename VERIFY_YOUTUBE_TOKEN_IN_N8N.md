# Verify YouTube Token is Being Passed Correctly

Since scopes are correct, the issue is likely:
1. **Token path is wrong** in n8n
2. **Token format is wrong** (missing "Bearer " or extra spaces)
3. **Token isn't actually being retrieved** from the API

## Step 1: Add Debug Node After "Get Video Details"

Add a **Code Node** right after your HTTP Request that calls `/api/n8n/video-details`:

**Code Node:**
```javascript
const response = $input.item.json;

// Log everything
console.log('=== FULL RESPONSE ===');
console.log(JSON.stringify(response, null, 2));

console.log('=== PLATFORM TOKENS ===');
console.log(JSON.stringify(response.platform_tokens, null, 2));

console.log('=== ACCESS TOKEN CHECK ===');
const token = response.platform_tokens?.access_token;
console.log('Token exists:', !!token);
console.log('Token type:', typeof token);
console.log('Token length:', token?.length || 0);
console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'NULL');

// Test if token works
if (token) {
  console.log('=== TESTING TOKEN ===');
  // This will be logged in n8n execution logs
}

// Return normalized data
return {
  json: {
    ...response,
    // Make token easily accessible
    google_access_token: response.platform_tokens?.access_token,
    video: response.video,
    platform_tokens: response.platform_tokens,
    // Debug info
    debug: {
      hasToken: !!response.platform_tokens?.access_token,
      tokenLength: response.platform_tokens?.access_token?.length || 0,
    }
  }
};
```

**Run this** and check n8n execution logs. You should see:
- Whether `platform_tokens.access_token` exists
- The token preview (first 30 chars)

## Step 2: Test Token Directly

Add a **test HTTP Request node** to verify the token works:

**Test Node:**
- **Name:** "Test YouTube Token"
- **Method:** GET
- **URL:** `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`
- **Headers:**
  - **Name:** `Authorization`
  - **Value:** `Bearer {{ $('Code').item.json.google_access_token }}`
  - (Replace `Code` with your actual Code node name)

**Expected Result:**
- **Status:** 200 OK
- **Body:** Your YouTube channel info

**If this fails:**
- Token is invalid or wrong format
- Check the error message

**If this succeeds:**
- Token is valid, the issue is in your upload node

## Step 3: Fix Your Upload HTTP Request Node

In your YouTube upload HTTP Request node, use:

```json
{
  "method": "POST",
  "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $('Code').item.json.google_access_token }}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**Important:**
- Header name must be exactly `"Authorization"` (capital A, lowercase rest)
- Value must start with `"Bearer "` (with space after Bearer)
- Use the Code node output, not the raw API response

## Step 4: Common Mistakes to Check

### ❌ Wrong: Missing "Bearer " prefix
```json
{
  "name": "Authorization",
  "value": "{{ $json.google_access_token }}"
}
```
**Fix:** Add `Bearer ` before the token

### ❌ Wrong: Extra spaces
```json
{
  "name": "Authorization",
  "value": "Bearer  {{ $json.google_access_token }}"
}
```
**Fix:** Only one space after "Bearer"

### ❌ Wrong: Using wrong node reference
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.google_access_token }}"
}
```
**Problem:** `$json` refers to current node, not the Code node
**Fix:** Use `{{ $('Code').item.json.google_access_token }}`

### ❌ Wrong: Token path doesn't exist
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.platform_tokens.access_token }}"
}
```
**Problem:** If using raw API response, need full path
**Fix:** Use Code node to normalize, then `{{ $('Code').item.json.google_access_token }}`

## Step 5: Verify Token Format

The token should:
- Start with `ya29.` (Google OAuth token format)
- Be about 100-200 characters long
- Not have any spaces or line breaks

If your token looks different, it might be invalid.

## Step 6: Check Token Refresh

The `/api/n8n/video-details` endpoint should auto-refresh expired tokens. Check:

1. **Look at the Code node output:**
   - Does `platform_tokens.access_token` exist?
   - Is it a valid-looking token?

2. **Check n8n execution logs:**
   - Look for messages about token refresh
   - If refresh failed, you'll see an error

3. **If token is missing:**
   - The refresh might have failed
   - Reconnect YouTube to get a fresh token

## Complete Workflow Structure

```
Webhook
  ↓
Respond to Webhook
  ↓
HTTP Request: Get Video Details
  ↓
Code Node: Extract & Log Token ← ADD THIS
  ↓
HTTP Request: Test Token (optional) ← ADD THIS TO VERIFY
  ↓
HTTP Request: Initiate YouTube Upload
  - Header: Authorization: Bearer {{ $('Code').item.json.google_access_token }}
```

## Quick Test

1. **Add Code node** after "Get Video Details"
2. **Check execution logs** - verify token exists
3. **Add test HTTP Request** - verify token works
4. **Fix upload node** - use Code node output

If the test HTTP Request works but upload fails, the issue is in the upload request format, not the token.

