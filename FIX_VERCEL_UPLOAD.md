# Fix Vercel Upload Payload Limit

**Error:** `FUNCTION_PAYLOAD_TOO_LARGE` on `/api/videos/[id]/upload`

**Problem:** Vercel has a 4.5MB limit. Videos are much larger.

**Solution:** Upload directly to n8n from the browser, bypassing Vercel.

## What I Fixed

1. ✅ **Enabled direct n8n upload** - Client now uploads directly to n8n (bypasses Vercel)
2. ✅ **Updated callback URL** - Uses Vercel domain automatically
3. ✅ **Created config API** - Returns n8n webhook URL and callback URL

## What You Need to Do

### 1. Fix n8n Webhook CORS

Your n8n webhook needs to allow requests from Vercel:

1. Open n8n workflow
2. Click **Webhook** node
3. Go to **Options** → **CORS**
4. Enable CORS or add your Vercel domain:
   - `https://your-app-name.vercel.app`
   - Or enable "Allow all origins"

### 2. Update n8n Workflow Callback URL

In your n8n workflow, the "HTTP Request" node that calls back should use:

**Vercel URL:**
```
https://your-app-name.vercel.app/api/webhooks/n8n/upload-complete
```

**NOT the IP address:**
```
http://93.127.216.83:3003/api/webhooks/n8n/upload-complete
```

The callback URL is now automatically sent from the client, so it will use the Vercel domain when deployed on Vercel.

### 3. Verify Environment Variables in Vercel

Make sure these are set:
- `N8N_WEBHOOK_URL_DROPBOX_UPLOAD` - Your n8n webhook URL
- `N8N_API_KEY` - For n8n to authenticate when calling back

### 4. Test

1. Go to: `https://your-app-name.vercel.app/upload`
2. Upload a video
3. Check browser console - should see "Uploading directly to n8n"
4. Check n8n execution logs - should see webhook triggered
5. Video should get `video_url` updated when n8n calls back

## How It Works Now

```
Browser → n8n Webhook (direct, bypasses Vercel)
         ↓
      Dropbox
         ↓
n8n → Vercel API (callback with URL)
         ↓
   Database updated
```

The file never goes through Vercel, so no payload limit issues!

## Troubleshooting

### CORS Error in Browser
- Enable CORS in n8n webhook settings
- Add Vercel domain to allowed origins

### n8n Not Receiving Request
- Check webhook URL is correct
- Verify webhook is active
- Check n8n logs

### Callback Not Working
- Verify callback URL in n8n is Vercel domain (not IP)
- Check `N8N_API_KEY` is set
- Check Vercel function logs for errors

