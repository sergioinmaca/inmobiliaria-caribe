import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
}

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-secondary',
  secondary: 'bg-secondary text-white hover:bg-accent',
  ghost: 'bg-transparent text-neutral-900 hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90',
  success: 'bg-success text-white hover:opacity-90',
}

const sizes: Record<'md' | 'sm', string> = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm ${sizes[size]} text-body font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
