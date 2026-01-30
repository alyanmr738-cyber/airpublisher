# Fix Dropbox Download URL for Binary File

## The Problem

Your Dropbox URL:
```
https://www.dropbox.com/scl/fi/acmwke0nleouhv6l6p584/cdfeb218-8228-48a7-93e4-2fb84cf49a5a.mp4?rlkey=rr3kq55xgci93ganx51w16f4f&dl=0
```

**`&dl=0`** = Returns HTML preview page (not the file)
**`&dl=1`** = Returns binary file download

## Solution: Two Options

### Option 1: Fix URL in HTTP Request Node (Recommended)

In your HTTP Request node that downloads from Dropbox:

**URL:**
```
{{ $('Get a row2').item.json.video_url.replace('&dl=0', '&dl=1').replace('?dl=0', '?dl=1') }}
```

This handles both:
- `?dl=0` → `?dl=1`
- `&dl=0` → `&dl=1`

**Settings:**
- **Method:** GET
- **Response Format:** File
- **Binary Property:** `data`

**This will automatically download the binary file!**

### Option 2: Use Code Node to Transform URL First

**Code Node:**
```javascript
const videoUrl = $input.item.json.video_url || $('Get a row2').item.json.video_url;

// Replace dl=0 with dl=1 (handles both ? and &)
const downloadUrl = videoUrl
  .replace('?dl=0', '?dl=1')
  .replace('&dl=0', '&dl=1')
  .replace('dl=0', 'dl=1'); // Catch any remaining

console.log('Original URL:', videoUrl);
console.log('Download URL:', downloadUrl);

return {
  json: {
    ...$input.item.json,
    video_url: videoUrl,
    download_url: downloadUrl,
  }
};
```

**Then in HTTP Request:**
- **URL:** `{{ $('Code').item.json.download_url }}`
- **Response Format:** File
- **Binary Property:** `data`

## Complete Workflow

```
Get a row2 (Supabase query)
  ↓
Code Node: Fix Dropbox URL (optional - can do in HTTP Request)
  ↓
HTTP Request: Download from Dropbox
  - URL: {{ $('Get a row2').item.json.video_url.replace('&dl=0', '&dl=1') }}
  - Response Format: File
  - Binary Property: data
  ↓
HTTP Request: Upload to YouTube
  - URL: {{ $('Set').item.json.upload_url }}
  - Method: PUT
  - Binary Property: {{ $('Download from Dropbox').item.binary.data }}
```

## Important: Response Format

In your HTTP Request node that downloads from Dropbox:

1. **Go to Options**
2. **Response Format:** Select **File** (not JSON, not String)
3. **Binary Property:** `data`

This tells n8n to:
- Download the file as binary data
- Store it in `item.binary.data`
- Ready to upload to YouTube

## Verify It Works

After downloading, check the node output:
- Should have `binary.data` property
- Should NOT be HTML/text
- File size should match your video file

## Quick Fix

In your HTTP Request node for Dropbox download:

**URL Field:**
```
{{ $('Get a row2').item.json.video_url.replace('&dl=0', '&dl=1') }}
```

**Options:**
- **Response Format:** File
- **Binary Property:** `data`

That's it! No Code node needed if you fix the URL directly in the HTTP Request node.

