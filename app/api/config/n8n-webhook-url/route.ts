import { NextResponse } from 'next/server'

/**
 * API endpoint to expose n8n webhook URL to frontend
 * This allows browser to upload directly to n8n, bypassing Next.js
 * which avoids ngrok timeout issues
 */
export async function GET() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_DROPBOX_UPLOAD
  
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'N8N_WEBHOOK_URL_DROPBOX_UPLOAD not configured' },
      { status: 404 }
    )
  }
  
  // Helper to get app URL
  const getAppUrl = () => {
    return process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000')
  }
  const appUrl = getAppUrl()
  
  return NextResponse.json({
    n8n_webhook_url: webhookUrl,
    callback_url: `${appUrl}/api/webhooks/n8n/upload-complete`,
  })
}


