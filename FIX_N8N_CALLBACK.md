# Fix n8n Callback Issues

## Issues Fixed

1. ✅ **Response body read twice** - Fixed by cloning response before reading
2. ✅ **RLS policy violation** - Fixed by using service role client in webhook
3. ⚠️ **Missing creator_unique_identifier** - Need to add to n8n workflow

## What You Need to Do in n8n

### Update the "HTTP Request" Node (Final Callback)

In your n8n workflow, the "HTTP Request" node that calls back to Vercel needs to include `creator_unique_identifier` in the JSON body.

**Current JSON Body:**
```json
{
  "video_id": "{{ $('Webhook').item.json.body.video_id }}",
  "video_url": "{{ $('HTTP Request1').item.json.url.replace('?dl=0', '?dl=1') }}",
  "dropbox_path": "{{ $('Upload a file').item.json.path_display }}",
  "processing_status": "completed"
}
```

**Update to:**
```json
{
  "video_id": "{{ $('Webhook').item.json.body.video_id }}",
  "video_url": "{{ $('HTTP Request1').item.json.url.replace('?dl=0', '?dl=1') }}",
  "dropbox_path": "{{ $('Upload a file').item.json.path_display }}",
  "creator_unique_identifier": "{{ $('Webhook').item.json.body.creator_unique_identifier }}",
  "processing_status": "completed"
}
```

### Steps:

1. Open your n8n workflow
2. Click on the **"HTTP Request"** node (the one that calls back to Vercel)
3. In the **JSON Body** field, add:
   ```
   "creator_unique_identifier": "{{ $('Webhook').item.json.body.creator_unique_identifier }}",
   ```
4. Save and activate the workflow

## What Was Fixed in Code

### 1. Upload Form - Response Body Reading
- Fixed "body stream already read" error by cloning response before reading
- Now uses `response.clone()` to avoid reading the same stream twice

### 2. Webhook Route - RLS Bypass
- Changed to use service role client (bypasses RLS)
- Now extracts `creator_unique_identifier` from callback body
- Uses it when creating missing video records

## Testing

After updating n8n workflow:

1. Upload a video from Vercel
2. Check browser console - should not see "body stream already read" error
3. Check n8n execution logs - should see callback succeed
4. Check Vercel function logs - should see video updated successfully
5. Verify video has `video_url` in database

## Troubleshooting

### Still getting 404 error?
- Verify `creator_unique_identifier` is in n8n callback JSON body
- Check Vercel function logs for exact error
- Verify video exists in database before upload

### Still getting "body stream already read"?
- Clear browser cache
- Check browser console for exact error location
- Verify all response reads use cloned responses

