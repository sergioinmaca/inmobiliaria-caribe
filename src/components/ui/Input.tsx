import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-sm border border-neutral-300 px-3 py-2 text-body text-neutral-900 placeholder:text-neutral-500 focus:border-accent focus:outline-none ${className}`}
        {...props}
      />
    </div>
  )
}
