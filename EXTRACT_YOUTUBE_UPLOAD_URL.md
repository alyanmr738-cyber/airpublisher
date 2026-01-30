# Extract YouTube Upload URL from Location Header

## What You Got

```
[{}]
```

This is actually **GOOD NEWS!** ✅

The YouTube resumable upload initiation endpoint returns:
- **Status:** 200 OK
- **Body:** Empty or minimal (this is normal)
- **Location Header:** Contains the upload URL (this is what you need!)

## The Problem

You're looking at the response **body**, but the upload URL is in the **Location header**.

## Solution: Extract Location Header

### Step 1: Enable Full Response

In your HTTP Request node:
1. Go to **Options**
2. Enable **Full Response** or **Response Format: Full Response**
3. This gives you access to headers

### Step 2: Extract Location Header

Add a **Set Node** or **Code Node** after your HTTP Request:

**Option A: Set Node**
- **Fields to Set:**
  - **Name:** `upload_url`
  - **Value:** `{{ $('HTTP Request').item.headers.location }}`
  
  Or try:
  - **Value:** `{{ $('HTTP Request').item.headers.Location }}` (capital L)

**Option B: Code Node**
```javascript
const response = $input.item.json;
const headers = $input.item.headers || {};

// Location header might be lowercase or uppercase
const location = headers.location || headers.Location || headers['location'] || headers['Location'];

console.log('All headers:', JSON.stringify(headers, null, 2));
console.log('Location header:', location);

if (!location) {
  console.error('⚠️ Location header not found!');
  console.error('Available headers:', Object.keys(headers));
}

return {
  json: {
    upload_url: location,
    ...response,
    debug_headers: headers,
  }
};
```

### Step 3: Use Upload URL

In your next HTTP Request node (the one that uploads the video):

- **Method:** PUT
- **URL:** `{{ $('Set').item.json.upload_url }}`
- **Headers:**
  - `Content-Type: video/mp4`
- **Body:** Binary video file

## Why Response Body is Empty

The YouTube API returns:
- **Status 200 OK** (success)
- **Empty body** (this is normal)
- **Location header** with the upload URL

The Location header will look like:
```
https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=xyz123...
```

## Complete Flow

```
HTTP Request: Initiate Upload
  ↓
Response: 200 OK, Location header with upload URL
  ↓
Set/Code Node: Extract Location header
  ↓
HTTP Request: Upload video using Location URL
```

## Debugging: Check Headers

If Location header is missing:

1. **Verify Full Response is enabled** in HTTP Request options
2. **Check execution logs** - n8n should show all response headers
3. **Try different header name variations:**
   - `location` (lowercase)
   - `Location` (capital L)
   - `LOCATION` (all caps)

## Quick Fix

1. **Enable Full Response** in your HTTP Request node
2. **Add Set Node:**
   - Field: `upload_url`
   - Value: `{{ $('HTTP Request').item.headers.location }}`
3. **Use in next node:**
   - URL: `{{ $('Set').item.json.upload_url }}`

The empty response `[{}]` means it worked - you just need to get the Location header!

