# YouTube Upload from Dropbox URL

Since your video is stored in Dropbox (not a local binary file), you need to:

1. Download the video from Dropbox
2. Upload it to YouTube using the resumable upload URL

## Complete Flow

```
HTTP Request: Initiate YouTube Upload (get upload URL)
  ↓
Set Node: Extract Location header (upload URL)
  ↓
HTTP Request: Download video from Dropbox
  ↓
HTTP Request: Upload video to YouTube (PUT to upload URL)
```

## Step-by-Step

### Step 1: Initiate Upload (You Already Have This)

✅ You already have the upload URL from the Location header:
```
https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&upload_id=AJRbA5VwL72A6gGZSWUAsOGkRy6-aYzn5VgqqOezcziVCr4oDkMzGl8J_jv0XrnM16OK_rTXYE0Txfwj8LVcCIVVSyJs155kjZx5_tTT3zu-qKA
```

### Step 2: Extract Upload URL

**Set Node:**
- **Field:** `upload_url`
- **Value:** `{{ $json[0].headers.location }}`

### Step 3: Download Video from Dropbox

**HTTP Request Node:**
- **Name:** "Download Video from Dropbox"
- **Method:** GET
- **URL:** `{{ $json.video_url.replace('?dl=0', '?dl=1') }}`
  
  Or if your Dropbox URL is in a different field:
  - `{{ $json.video_url }}`
  - Make sure it ends with `?dl=1` (not `?dl=0`) to force download

- **Options:**
  - **Response Format:** File
  - **Binary Property:** `data`

**This will download the video file and store it as binary data.**

### Step 4: Upload Video to YouTube

**HTTP Request Node:**
- **Name:** "Upload Video to YouTube"
- **Method:** PUT
- **URL:** `{{ $('Set').item.json.upload_url }}`
- **Headers:**
  - **Name:** `Content-Type`
  - **Value:** `video/mp4` (or appropriate video type)
- **Body:** Binary Data
- **Binary Property:** `{{ $('Download Video from Dropbox').item.binary.data }}`

**Options:**
- **Response:** Full Response
- **Timeout:** 600000 (10 minutes for large files)

## Complete n8n Workflow Structure

```
1. HTTP Request: Initiate YouTube Upload
   - POST to: https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
   - Returns: Location header with upload URL

2. Set Node: Extract Upload URL
   - Field: upload_url
   - Value: {{ $json[0].headers.location }}

3. HTTP Request: Download from Dropbox
   - GET: {{ $json.video_url.replace('?dl=0', '?dl=1') }}
   - Response Format: File
   - Binary Property: data

4. HTTP Request: Upload to YouTube
   - PUT: {{ $('Set').item.json.upload_url }}
   - Body: Binary Data
   - Binary Property: {{ $('Download Video from Dropbox').item.binary.data }}
```

## Important Notes

### Dropbox URL Format

Make sure your Dropbox URL ends with `?dl=1` (not `?dl=0`):
- `?dl=0` = Preview page (HTML)
- `?dl=1` = Direct download (binary file)

**In n8n, use:**
```
{{ $json.video_url.replace('?dl=0', '?dl=1') }}
```

### Binary Data Handling

n8n stores binary files in `item.binary.data`. Make sure:
1. Download node has **Response Format: File**
2. Upload node uses **Binary Property: data**

### Video File Size

YouTube has limits:
- Max file size: 256GB
- Max duration: 12 hours
- Supported formats: MP4, MOV, AVI, etc.

For very large files, the resumable upload will handle chunking automatically.

## Alternative: Stream from Dropbox

If the file is very large, you might want to stream it instead of downloading fully:

**HTTP Request Node (Upload):**
- **Method:** PUT
- **URL:** `{{ $('Set').item.json.upload_url }}`
- **Headers:**
  - `Content-Type: video/mp4`
  - `Content-Length: {{ $('Download Video from Dropbox').item.headers['content-length'] }}`
- **Body:** Binary Data
- **Binary Property:** `{{ $('Download Video from Dropbox').item.binary.data }}`

But for most cases, downloading then uploading works fine.

## Expected Response from YouTube Upload

After uploading, you should get:

```json
{
  "kind": "youtube#video",
  "etag": "...",
  "id": "VIDEO_ID_HERE",
  "snippet": {
    "title": "Your Video Title",
    "description": "...",
    ...
  }
}
```

Extract the `id` field - that's your YouTube video ID!

## Troubleshooting

### Download Fails
- Check Dropbox URL is accessible
- Verify URL ends with `?dl=1`
- Check if file exists in Dropbox

### Upload Fails
- Verify upload URL is correct (from Location header)
- Check Content-Type matches video format
- Verify binary data exists in previous node

### Timeout
- Increase timeout in HTTP Request options
- For very large files, resumable upload handles this automatically

