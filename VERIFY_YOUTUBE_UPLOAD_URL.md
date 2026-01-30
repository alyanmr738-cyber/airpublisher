# Verify YouTube Upload URL

## Correct YouTube Resumable Upload URL

The correct endpoint for initiating a resumable upload is:

```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```

## Key Points

1. **Must have `/upload/` in the path** - This is critical!
2. **Method must be POST** (not PATCH, not PUT)
3. **uploadType=resumable** (for large files)
4. **part=snippet,status** (required parameters)

## Common URL Mistakes

### ❌ Wrong: Missing `/upload/`
```
https://www.googleapis.com/youtube/v3/videos?uploadType=resumable&part=snippet,status
```
**Problem:** Missing `/upload/` - this endpoint doesn't accept file uploads

### ✅ Correct: Has `/upload/`
```
https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```

### ❌ Wrong: Wrong method
```
PATCH https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```
**Problem:** Should be POST, not PATCH

### ✅ Correct: POST method
```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```

## Your n8n HTTP Request Node Should Have

**URL:**
```
https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```

**Method:** POST

**Headers:**
- `Authorization: Bearer {{ $json.google_access_token }}`
- `Content-Type: application/json`

**Body (JSON):**
```json
{
  "snippet": {
    "title": "{{ $json.title }}",
    "description": "{{ $json.description || '' }}",
    "categoryId": "22",
    "defaultLanguage": "en"
  },
  "status": {
    "privacyStatus": "public",
    "selfDeclaredMadeForKids": false
  }
}
```

**Options:**
- Enable **Full Response** (to capture Location header)

## Expected Response

If the URL is correct, you should get:
- **Status:** `200 OK`
- **Location Header:** Contains the resumable upload URL (something like `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=...`)

If you get `404`, the URL is wrong.

## Two-Step Process

### Step 1: Initiate Upload
- **URL:** `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
- **Method:** POST
- **Returns:** Location header with upload URL

### Step 2: Upload Video
- **URL:** `{Location header from Step 1}`
- **Method:** PUT
- **Body:** Binary video file

## Quick Check

In your n8n node, verify:
1. ✅ URL contains `/upload/` (not just `/youtube/v3/videos`)
2. ✅ Method is POST (not PATCH)
3. ✅ Has `uploadType=resumable` parameter
4. ✅ Has `part=snippet,status` parameter
5. ✅ Authorization header has "Bearer " prefix
6. ✅ Full Response is enabled

If all of these are correct and you still get 404, the issue might be:
- Token is invalid (even though it looks valid)
- API quota exceeded
- Account doesn't have upload permissions
