const TEAL = '#0d968b'

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-32 w-32 text-3xl',
}

interface AvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof sizeMap
  className?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name)
  const sizeClass = sizeMap[size]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const fallback = target.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ backgroundColor: TEAL }}
    >
      {initials}
    </div>
  )
}

/** Use this pair when you need the onError fallback to initials */
export function AvatarWithFallback({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name)
  const sizeClass = sizeMap[size]

  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {src && (
        <img
          src={src}
          alt={name}
          className={`${sizeClass} rounded-full object-cover`}
          onError={(e) => {
            const img = e.currentTarget
            img.style.display = 'none'
            const fallback = img.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.removeProperty('display')
          }}
        />
      )}
      <span
        className={`${sizeClass} flex items-center justify-center rounded-full font-bold text-white`}
        style={{ backgroundColor: TEAL, display: src ? 'none' : 'flex' }}
      >
        {initials}
      </span>
    </span>
  )
}
