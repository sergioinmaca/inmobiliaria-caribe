import type { HTMLAttributes } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  default: 'bg-surface text-neutral-900',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-small font-semibold ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
