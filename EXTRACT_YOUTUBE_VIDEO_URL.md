# Extract YouTube Video URL from Upload Response

## Your Video Was Published! ✅

**Video ID:** `GfFt1n_LHpU`
**Title:** "video 01"
**Channel:** "UndyingGerm"
**Published:** 2026-01-30T03:59:23Z

## YouTube Video URL

Your video is live at:
```
https://www.youtube.com/watch?v=GfFt1n_LHpU
```

## Extract Video URL in n8n

### Option 1: Code Node (Recommended)

Add a **Code Node** after your YouTube upload HTTP Request:

```javascript
const response = $input.item.json;
const videoId = response[0]?.id || response?.id;

if (!videoId) {
  console.error('No video ID found in response');
  return {
    json: {
      error: 'No video ID in YouTube response',
      raw_response: response,
    }
  };
}

const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

console.log('✅ Video uploaded successfully!');
console.log('Video ID:', videoId);
console.log('Video URL:', videoUrl);

return {
  json: {
    video_id: videoId, // From your original payload
    platform: 'youtube',
    status: 'posted',
    platform_post_id: videoId,
    platform_url: videoUrl,
    error_message: null,
    // Include original video data
    youtube_response: response[0] || response,
  }
};
```

### Option 2: Set Node

**Set Node:**
- **Fields to Set:**
  - **Name:** `video_id`
  - **Value:** `{{ $json[0].id }}` (or `{{ $json.id }}` if not array)
  
  - **Name:** `platform_url`
  - **Value:** `https://www.youtube.com/watch?v={{ $json[0].id }}`
  
  - **Name:** `platform_post_id`
  - **Value:** `{{ $json[0].id }}`
  
  - **Name:** `status`
  - **Value:** `posted`

## Report Status Back to Your App

After extracting the video URL, call your callback endpoint:

**HTTP Request Node:**
- **Method:** POST
- **URL:** `{{ $json.callback_url }}` (from your original webhook payload)
- **Headers:**
  - `x-n8n-api-key`: `{{ $env.N8N_API_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "video_id": "{{ $('Code').item.json.video_id }}",
  "platform": "youtube",
  "status": "posted",
  "platform_post_id": "{{ $('Code').item.json.platform_post_id }}",
  "platform_url": "{{ $('Code').item.json.platform_url }}",
  "error_message": null
}
```

This will update your database with:
- `status: 'posted'`
- `posted_at: [timestamp]`
- `platform_post_id: 'GfFt1n_LHpU'`
- `platform_url: 'https://www.youtube.com/watch?v=GfFt1n_LHpU'`

## Your Video Details

From the response:
- **Video ID:** `GfFt1n_LHpU`
- **Video URL:** `https://www.youtube.com/watch?v=GfFt1n_LHpU`
- **Channel:** UndyingGerm
- **Status:** Uploaded and public
- **Published:** January 30, 2026 at 03:59:23 UTC

## Complete Workflow Structure

```
Webhook (receives payload)
  ↓
Get Video Details (from Supabase or API)
  ↓
Initiate YouTube Upload (get upload URL)
  ↓
Extract Upload URL (from Location header)
  ↓
Download Video from Dropbox
  ↓
Upload Video to YouTube (PUT to upload URL)
  ↓
Code Node: Extract Video ID & Build URL
  - video_id: GfFt1n_LHpU
  - platform_url: https://www.youtube.com/watch?v=GfFt1n_LHpU
  ↓
HTTP Request: Report Status Back
  - POST to callback_url
  - Updates database with video URL
```

## Quick Reference

**Video URL Format:**
```
https://www.youtube.com/watch?v={VIDEO_ID}
```

**Your Video:**
```
https://www.youtube.com/watch?v=GfFt1n_LHpU
```

