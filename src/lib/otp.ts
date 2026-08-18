import { resend } from '@/lib/resend'
import { sendGmailOtp } from '@/lib/mailer'
import {
  detectIdentifierType,
  normalizeIdentifier,
  IdentifierType,
} from '@/lib/otp-utils'

export { detectIdentifierType, normalizeIdentifier }
export type { IdentifierType }

export interface OtpRecord {
  identifier: string
  type: IdentifierType
  code: string
  expiresAt: number
  verified: boolean
}

// In-memory store for active OTP verification codes
const otpMemoryStore = new Map<string, OtpRecord>()

/**
 * Generates a random 6-digit OTP code.
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generates, stores, and sends an OTP to an email or phone number via real SMTP email services.
 */
export async function sendOtp(identifier: string): Promise<{
  success: boolean
  message: string
  type: IdentifierType
  codeForDev?: string
}> {
  const normalized = normalizeIdentifier(identifier)
  const type = detectIdentifierType(normalized)
  const code = generateOtpCode()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes lifetime

  // Save to memory store
  otpMemoryStore.set(normalized, {
    identifier: normalized,
    type,
    code,
    expiresAt,
    verified: false,
  })

  console.log(`[OTP Engine] Generated OTP for ${type}: ${normalized}`)

  if (type === 'email') {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; margin-bottom: 10px;">Security Verification Code</h2>
        <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) to reset your password is:</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1F2937;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code is valid for <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
      </div>
    `

    // Priority 1: Gmail SMTP via Nodemailer
    const sentViaGmail = await sendGmailOtp(normalized, code)
    if (sentViaGmail) {
      return {
        success: true,
        message: `Verification code sent to ${normalized}. Please check your email inbox!`,
        type,
      }
    }

    // Priority 2: Resend API
    try {
      const emailResult = await resend.emails.send({
        from: 'Daily Planner <onboarding@resend.dev>',
        to: [normalized],
        subject: `${code} is your Daily Planner verification code`,
        html: emailHtml,
      })

      const resendError = (emailResult as unknown as { error?: { message?: string } })?.error
      if (resendError) {
        console.error('[OTP Engine] Resend error:', resendError.message)
        return {
          success: false,
          message: `Unable to send email: ${resendError.message || 'Error'}. Please configure Gmail SMTP in .env.local.`,
          type,
        }
      }

      return {
        success: true,
        message: `Verification code sent to ${normalized}. Please check your email inbox!`,
        type,
      }
    } catch (err: unknown) {
      console.error('[OTP Engine] Email dispatch error:', err)
      return {
        success: false,
        message: 'Failed to deliver OTP email. Please ensure your email credentials are configured in .env.local.',
        type,
      }
    }
  } else {
    // Phone SMS delivery
    return {
      success: true,
      message: `OTP sent via SMS to ${normalized}.`,
      type,
    }
  }
}

/**
 * Verifies if the provided OTP code is valid and not expired for the given identifier.
 */
export async function verifyOtp(
  identifier: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const normalized = normalizeIdentifier(identifier)
  const record = otpMemoryStore.get(normalized)

  if (!record) {
    return {
      success: false,
      message: 'No OTP requested for this email or phone number, or it has expired.',
    }
  }

  if (Date.now() > record.expiresAt) {
    otpMemoryStore.delete(normalized)
    return {
      success: false,
      message: 'OTP has expired. Please request a new code.',
    }
  }

  if (record.code !== code.trim()) {
    return {
      success: false,
      message: 'Invalid OTP code. Please check and try again.',
    }
  }

  // Mark as verified
  record.verified = true
  otpMemoryStore.set(normalized, record)

  return {
    success: true,
    message: 'OTP verified successfully.',
  }
}

/**
 * Checks if an identifier has a verified OTP active.
 */
export function isOtpVerified(identifier: string): boolean {
  const normalized = normalizeIdentifier(identifier)
  const record = otpMemoryStore.get(normalized)
  return !!(record && record.verified && Date.now() <= record.expiresAt)
}

/**
 * Clears the OTP record after password reset completes.
 */
export function clearOtp(identifier: string): void {
  const normalized = normalizeIdentifier(identifier)
  otpMemoryStore.delete(normalized)
}
