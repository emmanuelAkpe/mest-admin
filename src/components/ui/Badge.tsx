type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-indigo-50 text-indigo-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-slate-100 text-slate-600',
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
