# n8n YouTube Posting Automation

Complete workflow for posting videos to YouTube immediately when "Post Now" is clicked.

## Workflow Overview

```
Webhook (receives payload)
  ↓
HTTP Request (get video details + tokens)
  ↓
YouTube API (upload video)
  ↓
HTTP Request (report status back)
```

## 1. Webhook Node (Trigger)

**Node Type:** Webhook
**Settings:**
- **HTTP Method:** POST
- **Path:** `15ec8f2d-a77c-4407-8ab8-cd505284bb42` (or your webhook path)
- **Response Mode:** Respond to Webhook
- **Options:**
  - **CORS:** Enabled (or add your Vercel domain)

**Expected Payload:**
```json
{
  "video_id": "cdfeb218-8228-48a7-93e4-2fb84cf49a5a",
  "creator_unique_identifier": "creator_735175e5_1768726539_f7262d3a",
  "platform": "youtube",
  "trigger_type": "immediate",
  "video_url": "https://www.dropbox.com/scl/fi/.../video.mp4?rlkey=...&dl=1",
  "title": "Video Title",
  "description": "Video description",
  "thumbnail_url": null,
  "callback_url": "https://airpublisher.vercel.app/api/webhooks/n8n/post-status"
}
```

## 2. Respond to Webhook Node

**Node Type:** Respond to Webhook
**Settings:**
- **Response Code:** 200
- **Response Body:** `{ "status": "accepted", "message": "Processing video upload" }`

**Purpose:** Respond immediately to prevent timeout

## 3. HTTP Request Node - Get Video Details & Tokens

**Node Type:** HTTP Request
**Settings:**
- **Method:** GET
- **URL:** `https://airpublisher.vercel.app/api/n8n/video-details?video_id={{ $json.video_id }}`
- **Authentication:** None (uses API key header)
- **Headers:**
  - `x-n8n-api-key`: `{{ $env.N8N_API_KEY }}`
  - `Content-Type`: `application/json`

**Purpose:** 
- Refreshes YouTube access token if expired
- Gets all video metadata
- Gets platform tokens

**Response will include:**
```json
{
  "video": {
    "id": "...",
    "title": "...",
    "description": "...",
    "video_url": "...",
    "thumbnail_url": "...",
    "creator_unique_identifier": "..."
  },
  "tokens": {
    "google_access_token": "...",
    "google_refresh_token": "...",
    "expires_at": "..."
  },
  "creator": {
    "unique_identifier": "..."
  }
}
```

## 4. IF Node - Check Platform

**Node Type:** IF
**Condition:** `{{ $json.platform === 'youtube' }}`

**Purpose:** Only process YouTube posts (you can add other platforms later)

## 5. HTTP Request Node - YouTube Upload (Resumable Upload)

**Node Type:** HTTP Request
**Settings:**
- **Method:** POST
- **URL:** `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
- **Authentication:** Generic Credential Type
- **Headers:**
  - `Authorization`: `Bearer {{ $('HTTP Request').item.json.tokens.google_access_token }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "snippet": {
    "title": "{{ $('HTTP Request').item.json.video.title }}",
    "description": "{{ $('HTTP Request').item.json.video.description || '' }}",
    "tags": [],
    "categoryId": "22",
    "defaultLanguage": "en",
    "defaultAudioLanguage": "en"
  },
  "status": {
    "privacyStatus": "public",
    "selfDeclaredMadeForKids": false
  }
}
```

**Options:**
- **Response:** Full Response
- **Timeout:** 300000 (5 minutes)

**This will return:**
- **Location header:** Contains the resumable upload URL
- **Status:** 200 OK

## 6. Set Node - Extract Upload URL

**Node Type:** Set
**Settings:**
- **Keep Only Set Fields:** No
- **Fields to Set:**
  - **Name:** `upload_url`
  - **Value:** `{{ $('HTTP Request1').item.headers.location }}`

**Purpose:** Extract the resumable upload URL from the Location header

## 7. HTTP Request Node - Upload Video File

**Node Type:** HTTP Request
**Settings:**
- **Method:** PUT
- **URL:** `{{ $('Set').item.json.upload_url }}`
- **Authentication:** None
- **Headers:**
  - `Content-Type`: `video/mp4` (or appropriate video type)
  - `Content-Length**: `{{ $('HTTP Request').item.json.video.file_size }}` (if available)
- **Body:** Binary Data
- **Binary Property:** Download the video from Dropbox URL

**Options:**
- **Response:** Full Response
- **Timeout:** 600000 (10 minutes for large files)

**Note:** You may need to download the video from Dropbox first, then upload to YouTube. See alternative approach below.

## Alternative: Download from Dropbox, Then Upload to YouTube

If YouTube doesn't accept direct Dropbox URLs, use this approach:

### 7a. HTTP Request Node - Download Video from Dropbox

**Node Type:** HTTP Request
**Settings:**
- **Method:** GET
- **URL:** `{{ $('HTTP Request').item.json.video.video_url.replace('?dl=0', '?dl=1') }}`
- **Authentication:** None
- **Response Format:** File
- **Options:**
  - **Response:** File
  - **Binary Property:** `data`

### 7b. HTTP Request Node - Upload to YouTube

**Node Type:** HTTP Request
**Settings:**
- **Method:** PUT
- **URL:** `{{ $('Set').item.json.upload_url }}`
- **Authentication:** None
- **Headers:**
  - `Content-Type**: `video/mp4`
- **Body:** Binary Data
- **Binary Property:** `{{ $('HTTP Request2').item.binary.data }}`

**Options:**
- **Response:** Full Response
- **Timeout:** 600000 (10 minutes)

## 8. Parse YouTube Response

**Node Type:** Code (JavaScript)
**Settings:**
```javascript
const response = $input.item.json;
const videoId = response.id;

return {
  json: {
    video_id: $('HTTP Request').item.json.video.id,
    platform: 'youtube',
    status: 'posted',
    platform_post_id: videoId,
    platform_url: `https://www.youtube.com/watch?v=${videoId}`,
    error_message: null
  }
};
```

**Purpose:** Extract YouTube video ID and format status response

## 9. HTTP Request Node - Report Status Back

**Node Type:** HTTP Request
**Settings:**
- **Method:** POST
- **URL:** `{{ $('HTTP Request').item.json.callback_url || 'https://airpublisher.vercel.app/api/webhooks/n8n/post-status' }}`
- **Authentication:** None
- **Headers:**
  - `x-n8n-api-key`: `{{ $env.N8N_API_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "video_id": "{{ $('Code').item.json.video_id }}",
  "platform": "{{ $('Code').item.json.platform }}",
  "status": "{{ $('Code').item.json.status }}",
  "platform_post_id": "{{ $('Code').item.json.platform_post_id }}",
  "platform_url": "{{ $('Code').item.json.platform_url }}",
  "error_message": null
}
```

## Error Handling

### Add Error Catch Node

**Node Type:** Error Trigger
**Settings:** Catch all errors

**Then add HTTP Request to report error:**
- **Method:** POST
- **URL:** `{{ $('HTTP Request').item.json.callback_url }}`
- **Headers:**
  - `x-n8n-api-key`: `{{ $env.N8N_API_KEY }}`
- **Body:**
```json
{
  "video_id": "{{ $('HTTP Request').item.json.video_id }}",
  "platform": "youtube",
  "status": "failed",
  "error_message": "{{ $json.error.message }}"
}
```

## Complete n8n Workflow JSON

Here's the complete workflow structure:

```json
{
  "name": "YouTube Immediate Post",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "15ec8f2d-a77c-4407-8ab8-cd505284bb42",
        "responseMode": "responseNode"
      },
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook"
    },
    {
      "parameters": {
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "name": "Respond to Webhook"
    },
    {
      "parameters": {
        "method": "GET",
        "url": "=https://airpublisher.vercel.app/api/n8n/video-details?video_id={{ $json.video_id }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-n8n-api-key",
              "value": "={{ $env.N8N_API_KEY }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Get Video Details"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.platform }}",
              "operation": "equals",
              "value2": "youtube"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.if",
      "name": "Check Platform"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $('Get Video Details').item.json.tokens.google_access_token }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"snippet\": {\n    \"title\": \"{{ $('Get Video Details').item.json.video.title }}\",\n    \"description\": \"{{ $('Get Video Details').item.json.video.description || '' }}\",\n    \"categoryId\": \"22\",\n    \"privacyStatus\": \"public\"\n  },\n  \"status\": {\n    \"privacyStatus\": \"public\"\n  }\n}",
        "options": {
          "response": {
            "response": {
              "fullResponse": true
            }
          }
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Initiate YouTube Upload"
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "upload_url",
              "value": "={{ $('Initiate YouTube Upload').item.headers.location }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.set",
      "name": "Extract Upload URL"
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ $('Get Video Details').item.json.video.video_url.replace('?dl=0', '?dl=1') }}",
        "options": {
          "response": {
            "response": {
              "response": {
                "responseFormat": "file"
              }
            }
          }
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Download Video from Dropbox"
    },
    {
      "parameters": {
        "method": "PUT",
        "url": "={{ $('Extract Upload URL').item.json.upload_url }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "video/mp4"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "binary",
        "binaryPropertyName": "data",
        "options": {
          "response": {
            "response": {
              "fullResponse": true
            }
          }
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Upload Video to YouTube"
    },
    {
      "parameters": {
        "jsCode": "const response = $input.item.json;\nconst videoId = response.id;\n\nreturn {\n  json: {\n    video_id: $('Get Video Details').item.json.video.id,\n    platform: 'youtube',\n    status: 'posted',\n    platform_post_id: videoId,\n    platform_url: `https://www.youtube.com/watch?v=${videoId}`,\n    error_message: null\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "name": "Parse YouTube Response"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $('Get Video Details').item.json.callback_url || 'https://airpublisher.vercel.app/api/webhooks/n8n/post-status' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-n8n-api-key",
              "value": "={{ $env.N8N_API_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"video_id\": \"{{ $('Parse YouTube Response').item.json.video_id }}\",\n  \"platform\": \"{{ $('Parse YouTube Response').item.json.platform }}\",\n  \"status\": \"{{ $('Parse YouTube Response').item.json.status }}\",\n  \"platform_post_id\": \"{{ $('Parse YouTube Response').item.json.platform_post_id }}\",\n  \"platform_url\": \"{{ $('Parse YouTube Response').item.json.platform_url }}\",\n  \"error_message\": null\n}"
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Report Status"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Respond to Webhook": {
      "main": [
        [
          {
            "node": "Get Video Details",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get Video Details": {
      "main": [
        [
          {
            "node": "Check Platform",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Platform": {
      "main": [
        [
          {
            "node": "Initiate YouTube Upload",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Initiate YouTube Upload": {
      "main": [
        [
          {
            "node": "Extract Upload URL",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Upload URL": {
      "main": [
        [
          {
            "node": "Download Video from Dropbox",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Download Video from Dropbox": {
      "main": [
        [
          {
            "node": "Upload Video to YouTube",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Upload Video to YouTube": {
      "main": [
        [
          {
            "node": "Parse YouTube Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse YouTube Response": {
      "main": [
        [
          {
            "node": "Report Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Environment Variables Needed

In n8n:
- `N8N_API_KEY` - Your n8n API key for authenticating with Air Publisher

## Testing

1. **Test the webhook:**
   ```bash
   curl -X POST https://support-team.app.n8n.cloud/webhook/15ec8f2d-a77c-4407-8ab8-cd505284bb42 \
     -H "Content-Type: application/json" \
     -d '{
       "video_id": "your-video-id",
       "creator_unique_identifier": "creator_xxx",
       "platform": "youtube",
       "trigger_type": "immediate",
       "video_url": "https://www.dropbox.com/...",
       "title": "Test Video",
       "description": "Test description",
       "callback_url": "https://airpublisher.vercel.app/api/webhooks/n8n/post-status"
     }'
   ```

2. **Check n8n execution logs** - Should see all nodes executing
3. **Check YouTube** - Video should appear on your channel
4. **Check database** - Video status should be updated to "posted"

## Troubleshooting

### Token Expired
- `/api/n8n/video-details` automatically refreshes tokens
- Check logs if refresh fails

### Upload Fails
- Check video file size (YouTube has limits)
- Verify Dropbox URL is accessible
- Check YouTube API quota

### Status Not Updated
- Verify callback URL is correct
- Check `x-n8n-api-key` header is set
- Check Vercel function logs

## Next Steps

1. Import this workflow into n8n
2. Set environment variable `N8N_API_KEY`
3. Test with a video
4. Add error handling nodes
5. Add retry logic for failed uploads

