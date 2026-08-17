'use client'

import { useState } from 'react'

export function PasswordField({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
}: {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <label>
      {label}
      <div className="password-field">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button type="button" onClick={() => setShow((open) => !open)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}
