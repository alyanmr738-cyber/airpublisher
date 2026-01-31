# n8n: Scheduled Posting Automation Workflow

This workflow fetches scheduled posts from Supabase and publishes them to the appropriate platforms.

## Workflow Overview

```
[Cron Trigger] (every 5-15 minutes)
  ↓
[Get Scheduled Posts] (HTTP Request to API)
  ↓
[Split in Batches] (process multiple posts)
  ↓
[Get Video Details & Tokens] (for each post)
  ↓
[Platform Router] (YouTube / Instagram / TikTok)
  ↓
[Post to Platform]
  ↓
[Update Scheduled Post Status] (Supabase)
  ↓
[Update Video URL] (Supabase)
```

## Step-by-Step Setup

### 1. Cron Trigger Node

**Node:** Cron  
**Name:** "Check Scheduled Posts"

**Schedule:**
- **Every:** 5-15 minutes (recommended: 10 minutes)
- This ensures posts are published within 5-15 minutes of their scheduled time

**Configuration:**
```
Rule: Every 10 minutes
```

### 2. HTTP Request: Get Scheduled Posts

**Node:** HTTP Request  
**Name:** "Get Scheduled Posts"

**Method:** GET  
**URL:** `https://airpublisher.vercel.app/api/n8n/scheduled-posts?limit=50&before={{ $now }}`

**Headers:**
- `x-n8n-api-key: {{ $env.N8N_API_KEY }}`

**Query Parameters:**
- `limit`: 50 (max posts to fetch per run)
- `before`: `{{ $now }}` (current time - gets posts due now or earlier)

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "posts": [
    {
      "scheduled_post_id": "uuid",
      "video_id": "uuid",
      "creator_unique_identifier": "creator-id",
      "platform": "tiktok",
      "scheduled_at": "2024-01-15T14:30:00Z",
      "title": "Video Title",
      "description": "Description",
      "video_url": "https://...",
      "thumbnail_url": "https://..."
    }
  ]
}
```

### 3. Split in Batches (Optional)

**Node:** Split in Batches  
**Name:** "Process Posts in Batches"

**Batch Size:** 5-10 posts per batch

This prevents overwhelming the platform APIs and allows for better error handling.

### 4. Loop/Iterate Over Posts

**Node:** Split Out Items  
**Name:** "Iterate Posts"

Split the `posts` array so each post is processed individually.

### 5. HTTP Request: Get Video Details & Tokens

**Node:** HTTP Request  
**Name:** "Get Video Details & Tokens"

**Method:** GET  
**URL:** `https://airpublisher.vercel.app/api/n8n/video-details?video_id={{ $json.video_id }}`

**Headers:**
- `x-n8n-api-key: {{ $env.N8N_API_KEY }}`

**Expected Response:**
```json
{
  "success": true,
  "video": { ... },
  "platform_tokens": {
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

### 6. IF Node: Platform Router

**Node:** IF  
**Name:** "Route by Platform"

**Conditions:**
- `{{ $json.platform }}` equals `youtube` → YouTube branch
- `{{ $json.platform }}` equals `instagram` → Instagram branch
- `{{ $json.platform }}` equals `tiktok` → TikTok branch

### 7. Platform-Specific Posting

#### For TikTok:
Use your existing TikTok immediate posting workflow:
- Download video from Dropbox
- Initialize Upload
- Upload Video
- Publish Video
- Get Video URL
- Update TikTok URL in Supabase

#### For YouTube:
- YouTube API Upload node
- Update YouTube URL in Supabase

#### For Instagram:
- Instagram API Upload node
- Update Instagram URL in Supabase

### 8. Update Scheduled Post Status

**Node:** Supabase  
**Name:** "Update Scheduled Post Status"

**Operation:** Update  
**Table:** `air_publisher_scheduled_posts`  
**Update Key:** `id`  
**Update Key Value:** `{{ $('Get Scheduled Posts').item.json.scheduled_post_id }}`

**Fields:**
```json
{
  "status": "posted",
  "posted_at": "{{ $now }}"
}
```

**On Error:**
```json
{
  "status": "failed",
  "error_message": "{{ $json.error }}"
}
```

### 9. Update Video Status (Optional)

**Node:** Supabase  
**Name:** "Update Video Status"

**Operation:** Update  
**Table:** `air_publisher_videos`  
**Update Key:** `id`  
**Update Key Value:** `{{ $json.video_id }}`

**Fields:**
```json
{
  "status": "posted",
  "posted_at": "{{ $now }}"
}
```

## Error Handling

### Mark Failed Posts

If posting fails, update the scheduled post:

**Fields:**
```json
{
  "status": "failed",
  "error_message": "{{ $json.error_message }}"
}
```

### Retry Logic (Optional)

You can add retry logic:
- If status is "failed" and error is temporary (e.g., rate limit)
- Retry up to 3 times
- After 3 failures, mark as "failed" permanently

## Complete n8n Workflow JSON Structure

```json
{
  "name": "Scheduled Post Executor",
  "nodes": [
    {
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "interval": [{"field": "minutes", "minutesInterval": 10}]
        }
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "https://airpublisher.vercel.app/api/n8n/scheduled-posts",
        "qs": {
          "limit": 50,
          "before": "={{ $now }}"
        }
      }
    },
    {
      "type": "n8n-nodes-base.splitOutItems",
      "parameters": {
        "fieldToSplitOut": "posts"
      }
    }
    // ... rest of workflow
  ]
}
```

## Testing

1. **Create a test scheduled post** in Supabase:
   ```sql
   INSERT INTO air_publisher_scheduled_posts 
   (video_id, creator_unique_identifier, platform, scheduled_at)
   VALUES 
   ('video-uuid', 'creator-id', 'tiktok', NOW() + INTERVAL '1 minute');
   ```

2. **Run the workflow manually** in n8n
3. **Verify** the post is processed and status updated

## Monitoring

- Check n8n execution logs
- Monitor failed posts in Supabase
- Set up alerts for high failure rates
- Track posting success rate

## Notes

- Posts are fetched in order of `scheduled_at` (oldest first)
- Only posts with `status = 'pending'` are fetched
- Posts with `scheduled_at <= now` are considered due
- The workflow processes posts in batches to avoid rate limits

