# Fix YouTube Upload 404 Error

## Issues Found

### 1. ❌ Wrong Authorization Header Format

**Current (WRONG):**
```json
{
  "name": "Bearer",
  "value": "=Authorization {{ $json.google_access_token }}"
}
```

**Problem:** 
- Header name should be `"Authorization"`, not `"Bearer"`
- Value should be `"Bearer {token}"`, not `"Authorization {token}"`

**Fixed:**
```json
{
  "name": "Authorization",
  "value": "Bearer {{ $json.google_access_token }}"
}
```

### 2. ❌ Wrong HTTP Method

**Current:** `"method": "PATCH"`

**Should be:** `"method": "POST"`

YouTube's resumable upload initiation requires POST, not PATCH.

## Corrected HTTP Request Node Settings

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    "sendHeaders": true,
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
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"snippet\": {\n    \"title\": \"{{ $('Get a row2').item.json.title }}\",\n    \"description\": \"{{ $('Get a row2').item.json.description }}\",\n    \"tags\": [],\n    \"categoryId\": \"22\",\n    \"defaultLanguage\": \"en\",\n    \"defaultAudioLanguage\": \"en\"\n  },\n  \"status\": {\n    \"privacyStatus\": \"public\",\n    \"selfDeclaredMadeForKids\": false\n  }\n}",
    "options": {
      "response": {
        "response": {
          "fullResponse": true
        }
      }
    }
  }
}
```

## Key Changes

1. ✅ **Method:** Changed from `PATCH` to `POST`
2. ✅ **Authorization Header:**
   - Name: `"Authorization"` (not `"Bearer"`)
   - Value: `"Bearer {{ $json.google_access_token }}"` (not `"Authorization {{ $json.google_access_token }}"`)
3. ✅ **Added Full Response Option:** To capture the `Location` header

## How to Fix in n8n

1. **Open your HTTP Request node**
2. **Change Method:** Select `POST` (not PATCH)
3. **Fix Authorization Header:**
   - Click on the header
   - **Name:** Change from `Bearer` to `Authorization`
   - **Value:** Change from `=Authorization {{ $json.google_access_token }}` to `Bearer {{ $json.google_access_token }}`
4. **Enable Full Response:**
   - Go to **Options** → **Response**
   - Enable **Full Response** (to get headers including `Location`)
5. **Save and test**

## Expected Response

After fixing, you should get:
- **Status:** `200 OK`
- **Location Header:** Contains the resumable upload URL
- **Response Body:** Empty or minimal (the Location header is what you need)

## Next Steps

After this node succeeds:
1. Extract the `Location` header value (this is your upload URL)
2. Use that URL in the next HTTP Request node to upload the actual video file

## Common Issues

### Still Getting 404?
- Verify `google_access_token` is valid and not expired
- Check that the token has YouTube API permissions
- Ensure the token is for the correct Google account

### Getting 401 Unauthorized?
- Token might be expired - check if `/api/n8n/video-details` refreshed it
- Verify the token format: should be `Bearer {token}` not just `{token}`

### Location Header Not Found?
- Enable "Full Response" in options
- Check response headers, not just body
- The Location header is in `$json.headers.location` or `$json.headers['location']`

