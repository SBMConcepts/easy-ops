import * as React from 'react'

import { cn } from '../../lib/utils'

function initialsFromName(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Props for {@link Avatar}: an optional image source, display name (for initials fallback), and alt text. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null
  name?: string | null
  alt?: string
}

/**
 * Lightweight avatar: renders the image when `src` loads, otherwise falls back
 * to the user's initials. No external primitive dependency.
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, name, alt, className, ...props }, ref) => {
    const [failed, setFailed] = React.useState(false)

    React.useEffect(() => {
      setFailed(false)
    }, [src])

    const showImage = !!src && !failed
    const initials = initialsFromName(name)

    return (
      <span
        ref={ref}
        className={cn(
          'relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground select-none',
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src ?? undefined}
            alt={alt ?? name ?? 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
    )
  }
)
Avatar.displayName = 'Avatar'
