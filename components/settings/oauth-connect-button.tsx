'use client'

import { Button } from '@/components/ui/button'
import { ButtonProps } from '@/components/ui/button'

interface OAuthConnectButtonProps extends Omit<ButtonProps, 'onClick'> {
  oauthUrl: string
  children: React.ReactNode
}

/**
 * Client component for OAuth connection buttons
 * Uses window.location.href instead of Next.js Link to avoid RSC prefetching
 * which causes CORS errors with OAuth redirects
 */
export function OAuthConnectButton({ oauthUrl, children, ...buttonProps }: OAuthConnectButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Use window.location.href for OAuth redirects (not fetch/RSC)
    window.location.href = oauthUrl
  }

  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  )
}

