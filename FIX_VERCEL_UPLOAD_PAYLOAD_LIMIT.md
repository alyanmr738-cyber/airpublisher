# Fix Vercel Upload Payload Limit Error

**Error:** `FUNCTION_PAYLOAD_TOO_LARGE` on `/api/videos/[id]/upload`

**Problem:** Vercel has a 4.5MB limit for serverless function payloads. Video files are much larger.

**Solution:** Upload directly to n8n from the client, bypassing Vercel entirely.

## Current Flow (Broken on Vercel)

```
Client → Vercel API → n8n Webhook
         ❌ Fails here (payload too large)
```

## Fixed Flow

```
Client → n8n Webhook → Dropbox → Callback to Vercel
         ✅ Works (bypasses Vercel payload limit)
```

## Steps to Fix

### 1. Update n8n Webhook CORS Settings

Your n8n webhook needs to allow requests from your Vercel domain:

1. Open your n8n workflow
2. Click on the **Webhook** node
3. Go to **Options** → **CORS**
4. Enable CORS or add your Vercel domain:
   - `https://your-app-name.vercel.app`
   - Or enable "Allow all origins" for testing

### 2. Update n8n Workflow Callback URL

In your n8n workflow, the "HTTP Request" node that calls back needs to use your **Vercel URL**:

**Current (probably using ngrok/IP):**
```
http://93.127.216.83:3003/api/webhooks/n8n/upload-complete
```

**Update to:**
```
https://your-app-name.vercel.app/api/webhooks/n8n/upload-complete
```

### 3. Update Upload Form to Use Vercel URL for Callback

The upload form should get the callback URL from an API endpoint that returns the Vercel URL.

**Option A: Create a simple API endpoint that returns the callback URL**

Create `app/api/config/n8n-webhook-url/route.ts` (if it doesn't exist):

```typescript
import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/utils/app-url'

export async function GET() {
  const appUrl = getAppUrl()
  return NextResponse.json({
    callback_url: `${appUrl}/api/webhooks/n8n/upload-complete`,
    n8n_webhook_url: process.env.N8N_WEBHOOK_URL_DROPBOX_UPLOAD,
  })
}
```

**Option B: Update upload form to construct callback URL**

The upload form already uses `getAppUrl()` - make sure it's using the Vercel URL when deployed.

### 4. Verify Environment Variables in Vercel

Make sure these are set in Vercel:

- `N8N_WEBHOOK_URL_DROPBOX_UPLOAD` - Your n8n webhook URL
- `N8N_API_KEY` - For n8n to call back to your app

Vercel automatically sets `VERCEL_URL`, so `getAppUrl()` will use it.

### 5. Test Direct n8n Upload

The upload form should upload directly to n8n. Check:

1. Browser console for CORS errors
2. n8n execution logs to see if webhook is receiving requests
3. Network tab to see if request is going to n8n (not Vercel)

## Quick Fix: Update n8n Workflow

In your n8n workflow JSON, update the callback URL:

**Find this in the "HTTP Request" node:**
```json
"url": "={{ $('Webhook').item.json.body.callback_url }}"
```

**Make sure the callback_url being sent is:**
```
https://your-app-name.vercel.app/api/webhooks/n8n/upload-complete
```

**Or hardcode it in n8n:**
```json
"url": "https://your-app-name.vercel.app/api/webhooks/n8n/upload-complete"
```

## Alternative: Use Supabase Storage

If direct n8n upload doesn't work, use Supabase Storage as intermediate:

1. Client uploads to Supabase Storage (no size limit)
2. Get public URL
3. Send URL to n8n (not the file)
4. n8n downloads from Supabase, uploads to Dropbox
5. n8n calls back with Dropbox URL

But the direct n8n upload should work if CORS is configured correctly.

## Testing

1. **Test from Vercel deployment:**
   - Go to: `https://your-app-name.vercel.app/upload`
   - Upload a video
   - Check browser console for errors
   - Check n8n execution logs

2. **Verify n8n receives request:**
   - Check n8n workflow execution history
   - Should see webhook triggered
   - Should see file uploaded to Dropbox

3. **Verify callback works:**
   - Check Vercel function logs
   - Should see `/api/webhooks/n8n/upload-complete` called
   - Video should have `video_url` updated in database

## Troubleshooting

### CORS Error
- Enable CORS in n8n webhook settings
- Add Vercel domain to allowed origins

### n8n Not Receiving Request
- Check webhook URL is correct
- Verify webhook is active in n8n
- Check n8n logs for errors

### Callback Not Working
- Verify callback URL is Vercel URL (not IP)
- Check `N8N_API_KEY` is set in Vercel
- Verify `/api/webhooks/n8n/upload-complete` route exists

