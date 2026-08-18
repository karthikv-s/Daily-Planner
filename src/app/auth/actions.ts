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
  createLocalUser,
  authenticateLocalUser,
  updateLocalUserPassword,
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

  // Fallback to local database authentication if Supabase fails or is unreachable
  if (!authSuccess) {
    const localUser = authenticateLocalUser(identifier, password)
    if (localUser) {
      authSuccess = true
    }
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
  redirect('/')
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
    createLocalUser(identifier, phone, password)
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

  return {
    success: result.success,
    message: result.message,
    type: result.type,
  }
}


/**
 * Verifies a 6-digit OTP code sent to email or phone number.
 */
export async function verifyOtpAction(rawIdentifier: string, code: string): Promise<{
  success: boolean
  message: string
}> {
  if (!rawIdentifier || !code) {
    return { success: false, message: 'Identifier and OTP code are required.' }
  }

  const identifier = normalizeIdentifier(rawIdentifier)
  return await verifyOtpEngine(identifier, code)
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

  // Double check OTP verification state
  const verification = await verifyOtpEngine(identifier, code)
  if (!verification.success) {
    return verification
  }

  // Update password in local storage
  updateLocalUserPassword(identifier, newPassword)

  // Try updating password in Supabase if session active
  try {
    const supabase = await createClient()
    await supabase.auth.updateUser({ password: newPassword })
  } catch (err) {
    // Ignore remote network error
  }

  // Clear OTP from memory after successful reset
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
