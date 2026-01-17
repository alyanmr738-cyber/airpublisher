import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

// Using system fonts directly to avoid Google Fonts network issues
// Inter will be loaded via CSS if available, otherwise system fonts are used

export const metadata: Metadata = {
  title: 'AIR Publisher - Creator OS Platform',
  description: 'Publish, schedule, and track your content performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    return (
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    )
  } catch (error) {
    console.error('Layout error:', error)
    return (
      <html lang="en">
        <body>
          <div style={{ padding: '20px', color: 'white' }}>
            <h1>Error loading page</h1>
            <p>Please check the console for details.</p>
          </div>
        </body>
      </html>
    )
  }
}

