# Check Terminal Logs - Video Upload

## 🔍 What to Look For

When you click "Upload Video", **check your terminal** (where `npm run dev` is running) for these logs:

### ✅ Success Looks Like:

```
[UploadForm] Creating video record...
[createVideoAction] Starting video creation...
[createVideoAction] Creator found: dev_1768500291985_chydy8y
[createVideoAction] Video data to insert: {title: "...", status: "draft", ...}
[createVideoAction] Attempting to create video with regular client...
[createVideoAction] ✅ Video created successfully with regular client: {video-id}
[UploadForm] ✅ Video record created: {id: "...", title: "...", status: "draft"}
```

### ❌ Error Looks Like:

```
[createVideoAction] Regular client error: {error message}
[createVideoAction] Error details: {code, message, details, hint}
[createVideoAction] RLS blocked, using service role client...
[createVideoAction] Service client error: {error message}
```

---

## 🐛 Common Error Messages

### "column \"views\" does not exist"
**Fix**: Run migration `005_add_video_views.sql` in Supabase

### "row-level security" or "RLS"
**Fix**: Already handled with service role fallback

### "Table air_publisher_videos does not exist"
**Fix**: Run migration `001_create_air_publisher_tables.sql` in Supabase

### "Unauthorized" or "No creator found"
**Fix**: Creator profile lookup issue (we already fixed this)

---

## 📋 What to Share

When you upload, share:

1. **Terminal logs** - everything from `[UploadForm]` and `[createVideoAction]`
2. **Browser console** - any errors (F12 → Console)
3. **Supabase Dashboard** - does `air_publisher_videos` table exist?

The logs will tell us exactly what's failing! 🔍

