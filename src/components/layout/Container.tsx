import type { HTMLAttributes } from 'react'

export function Container({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 ${className}`}
      {...props}
    />
  )
}
