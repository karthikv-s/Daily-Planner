'use client'

import React, { useRef } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  className,
}: OtpInputProps) {
  const digits = Array.from({ length }, (_, i) => value[i] || '')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (disabled) return

    // Take only the last entered digit
    const digit = val.substring(val.length - 1)

    // Only allow numbers
    if (digit && !/^\d$/.test(digit)) return

    const updated = [...digits]
    updated[index] = digit
    setDigits(updated)

    const fullCode = updated.join('')
    onChange(fullCode)

    // Auto move focus to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Focus previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return

    const pastedData = e.clipboardData.getData('text').trim()
    if (!/^\d+$/.test(pastedData)) return

    const pastedDigits = pastedData.slice(0, length).split('')
    const updated = Array.from({ length }, (_, i) => pastedDigits[i] || '')
    setDigits(updated)
    onChange(updated.join(''))

    // Focus last filled digit or final input
    const nextFocusIndex = Math.min(pastedDigits.length, length - 1)
    inputRefs.current[nextFocusIndex]?.focus()
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={cn(
            'w-11 h-13 text-center text-xl font-bold rounded-lg border border-input bg-background shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:opacity-50',
            digit ? 'border-primary bg-primary/5 text-primary' : 'text-foreground'
          )}
          aria-label={`OTP Digit ${idx + 1}`}
        />
      ))}
    </div>
  )
}
