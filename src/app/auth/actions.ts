'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  sendOtp as sendOtpEngine,
  verifyOtp as verifyOtpEngine,
  isOtpVerified,
  clearOtp,
  detectIdentifierType,
  normalizeIdentifier,
  IdentifierType,
} from '@/lib/otp'
import {
  createLocalUserAsync,
  authenticateLocalUserAsync,
  updateLocalUserPasswordAsync,
} from '@/lib/auth-store'

/**
 * Handles user login with either Email ID or Phone Number + Password.
 */
export async function login(formData: FormData) {
  const rawIdentifier = (formData.get('identifier') || formData.get('email') || '') as string
  const password = formData.get('password') as string

  if (!rawIdentifier || !password) {
    return { error: 'Please provide both your email or phone number and password.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  const type = detectIdentifierType(identifier)

  let authSuccess = false
  let errorMessage: string | null = null

  try {
    const supabase = await createClient()

    if (type === 'email') {
      const authResult = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      })
      if (!authResult.error) {
        authSuccess = true
      } else {
        errorMessage = authResult.error.message
      }
    } else {
      let authResult = await supabase.auth.signInWithPassword({
        phone: identifier,
        password,
      })

      if (authResult.error && !identifier.includes('@')) {
        const syntheticEmail = `${identifier.replace(/\+/g, '')}@phone.user`
        authResult = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        })
      }

      if (!authResult.error) {
        authSuccess = true
      } else {
        errorMessage = authResult.error.message
      }
    }
  } catch (err: unknown) {
    console.warn('[Auth Server] Supabase connection unavailable, using local database store fallback:', err)
  }

  if (!authSuccess) {
    const localUser = await authenticateLocalUserAsync(identifier, password)
    if (localUser) {
      authSuccess = true
    }
  }

  if (errorMessage && (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('network'))) {
    errorMessage = null
  }

  if (!authSuccess) {
    return { error: errorMessage || 'Invalid login credentials. Please check your email/phone and password.' }
  }

  // Set persistent session cookie for authenticated user
  const cookieStore = await cookies()
  cookieStore.set('auth_session', JSON.stringify({ identifier, loggedInAt: Date.now() }), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Handles user registration accepting Email, Phone, and Password.
 */
export async function signup(formData: FormData) {
  const rawIdentifier = (formData.get('identifier') || formData.get('email') || '') as string
  const phone = (formData.get('phone') || '') as string
  const password = formData.get('password') as string

  if (!rawIdentifier || !password) {
    return { error: 'Email or phone number and password are required.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  const type = detectIdentifierType(identifier)

  let authSuccess = false
  let errorMessage: string | null = null

  try {
    const supabase = await createClient()

    if (type === 'email') {
      const authResult = await supabase.auth.signUp({
        email: identifier,
        password,
        options: {
          data: { phone: phone ? normalizeIdentifier(phone) : undefined },
        },
      })
      if (!authResult.error) {
        authSuccess = true
      } else {
        errorMessage = authResult.error.message
      }
    } else {
      let authResult = await supabase.auth.signUp({
        phone: identifier,
        password,
      })

      if (authResult.error) {
        const syntheticEmail = `${identifier.replace(/\+/g, '')}@phone.user`
        authResult = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            data: { phone: identifier },
          },
        })
      }

      if (!authResult.error) {
        authSuccess = true
      } else {
        errorMessage = authResult.error.message
      }
    }
  } catch (err: unknown) {
    console.warn('[Auth Server] Supabase network unavailable, registering user in local database store:', err)
  }

  // Always create/sync local user record so offline & standalone auth works seamlessly
  try {
    await createLocalUserAsync(identifier, phone, password)
    authSuccess = true
  } catch (err: unknown) {
    if (err instanceof Error && !authSuccess) {
      return { error: err.message }
    }
  }

  if (!authSuccess && errorMessage) {
    return { error: errorMessage }
  }

  // Set persistent session cookie upon account creation
  const cookieStore = await cookies()
  cookieStore.set('auth_session', JSON.stringify({ identifier, loggedInAt: Date.now() }), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Logs out the current user session.
 */
export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Ignore signout error if offline
  }

  const cookieStore = await cookies()
  cookieStore.delete('auth_session')

  revalidatePath('/', 'layout')
  redirect('/login')
}

import crypto from 'crypto'

const OTP_SECRET = 'daily-planner-otp-secret-key-2026'

/**
 * Sends a 6-digit OTP code to either email or phone number for password reset.
 */
export async function requestOtpAction(rawIdentifier: string): Promise<{
  success: boolean
  message: string
  type?: IdentifierType
}> {
  if (!rawIdentifier) {
    return { success: false, message: 'Please enter a valid email address or phone number.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  const result = await sendOtpEngine(identifier)

  if (result.success && result.codeForDev) {
    const hash = crypto
      .createHash('sha256')
      .update(`${result.codeForDev.trim()}:${identifier}:${OTP_SECRET}`)
      .digest('hex')

    const cookieStore = await cookies()
    cookieStore.set(
      'otp_session',
      JSON.stringify({
        identifier,
        hash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        verified: false,
      }),
      {
        httpOnly: true,
        path: '/',
        maxAge: 600,
        sameSite: 'lax',
      }
    )
  }

  return {
    success: result.success,
    message: result.message,
    type: result.type,
  }
}

/**
 * Verifies a 6-digit OTP code sent to email or phone number.
 */
export async function verifyOtpAction(
  rawIdentifier: string,
  code: string
): Promise<{
  success: boolean
  message: string
}> {
  if (!rawIdentifier || !code) {
    return { success: false, message: 'Identifier and OTP code are required.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  const cleanCode = code.trim()

  // 1. Try Cookie-based OTP Session (State-independent, perfect for Vercel)
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('otp_session')
    if (sessionCookie?.value) {
      const parsed = JSON.parse(sessionCookie.value)
      if (
        parsed &&
        parsed.identifier === identifier &&
        Date.now() <= (parsed.expiresAt || 0)
      ) {
        const expectedHash = crypto
          .createHash('sha256')
          .update(`${cleanCode}:${identifier}:${OTP_SECRET}`)
          .digest('hex')

        if (parsed.hash === expectedHash) {
          cookieStore.set(
            'otp_session',
            JSON.stringify({
              ...parsed,
              verified: true,
            }),
            {
              httpOnly: true,
              path: '/',
              maxAge: 600,
              sameSite: 'lax',
            }
          )
          return { success: true, message: 'OTP verified successfully.' }
        }
      }
    }
  } catch (err) {
    // Cookie parsing fallback
  }

  // 2. Fallback to Database / Server Store Verification
  return await verifyOtpEngine(identifier, cleanCode)
}

/**
 * Resets user password after successful OTP verification.
 */
export async function resetPasswordWithOtpAction(
  rawIdentifier: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!rawIdentifier || !code || !newPassword) {
    return { success: false, message: 'All fields are required.' }
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  const cleanCode = code.trim()

  let verified = false

  // 1. Check Cookie-based OTP verification state
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('otp_session')
    if (sessionCookie?.value) {
      const parsed = JSON.parse(sessionCookie.value)
      if (
        parsed &&
        parsed.identifier === identifier &&
        Date.now() <= (parsed.expiresAt || 0)
      ) {
        const expectedHash = crypto
          .createHash('sha256')
          .update(`${cleanCode}:${identifier}:${OTP_SECRET}`)
          .digest('hex')

        if (parsed.verified === true || parsed.hash === expectedHash) {
          verified = true
        }
      }
    }
  } catch (err) {
    // Ignore error
  }

  // 2. Fallback check DB verification state
  if (!verified) {
    const verification = await verifyOtpEngine(identifier, cleanCode)
    if (!verification.success) {
      return verification
    }
    verified = true
  }

  // Update password in local database store
  await updateLocalUserPasswordAsync(identifier, newPassword)

  // Try updating password in Supabase if session active
  try {
    const supabase = await createClient()
    await supabase.auth.updateUser({ password: newPassword })
  } catch (err) {
    // Ignore remote network error
  }

  // Clear OTP session cookie & memory store
  try {
    const cookieStore = await cookies()
    cookieStore.delete('otp_session')
  } catch (err) {
    // Ignore
  }
  clearOtp(identifier)

  return {
    success: true,
    message: 'Password reset successfully! You can now sign in with your new password.',
  }
}


export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required' }
  const res = await requestOtpAction(email)
  if (!res.success) return { error: res.message }
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  try {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
  } catch (err: unknown) {
    return { error: 'Database network error' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Returns the currently authenticated user identity (from Supabase or local auth session cookie).
 */
export async function getCurrentUser(): Promise<{ id: string; identifier: string } | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      return { id: data.user.id, identifier: data.user.email || data.user.id }
    }
  } catch (err) {
    // Supabase network or config unavailable
  }

  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('auth_session')
    if (sessionCookie?.value) {
      const parsed = JSON.parse(sessionCookie.value)
      if (parsed?.identifier) {
        return { id: parsed.identifier, identifier: parsed.identifier }
      }
    }
  } catch (err) {
    // Cookie parsing error
  }

  return null
}
