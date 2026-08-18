import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { normalizeIdentifier, detectIdentifierType } from '@/lib/otp'
import { createClient } from '@/lib/supabase/server'

export interface UserAccount {
  id: string
  email?: string
  phone?: string
  passwordHash: string
  createdAt: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function ensureStorageDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8')
    }
  } catch (err) {
    // Read-only filesystem on serverless environments like Vercel
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function getLocalUsers(): UserAccount[] {
  ensureStorageDir()
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8')
      return JSON.parse(content) || []
    }
  } catch (err) {
    // Ignore read errors
  }
  return []
}

export function saveLocalUsers(users: UserAccount[]) {
  ensureStorageDir()
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (err) {
    // Read-only filesystem on Vercel lambda instance
  }
}

export async function createLocalUserAsync(identifier: string, phoneInput: string, password: string): Promise<UserAccount> {
  const users = getLocalUsers()
  const normalized = normalizeIdentifier(identifier)
  const type = detectIdentifierType(normalized)

  const email = type === 'email' ? normalized : undefined
  const phone = type === 'phone' ? normalized : (phoneInput ? normalizeIdentifier(phoneInput) : undefined)

  const newUser: UserAccount = {
    id: crypto.randomUUID(),
    email,
    phone,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  // 1. Save locally if filesystem permits
  const existing = users.find((u) => (email && u.email === email) || (phone && u.phone === phone))
  if (!existing) {
    users.push(newUser)
    saveLocalUsers(users)
  }

  // 2. Save to Supabase DB local_users table for Vercel persistence
  try {
    const supabase = await createClient()
    await supabase.from('local_users').upsert({
      id: newUser.id,
      email: newUser.email,
      phone: newUser.phone,
      password_hash: newUser.passwordHash,
      created_at: newUser.createdAt,
    })
  } catch (err) {
    // Supabase DB connection error
  }

  return newUser
}

export function createLocalUser(identifier: string, phoneInput: string, password: string): UserAccount {
  const users = getLocalUsers()
  const normalized = normalizeIdentifier(identifier)
  const type = detectIdentifierType(normalized)

  const email = type === 'email' ? normalized : undefined
  const phone = type === 'phone' ? normalized : (phoneInput ? normalizeIdentifier(phoneInput) : undefined)

  const existing = users.find(
    (u) => (email && u.email === email) || (phone && u.phone === phone)
  )

  if (existing) {
    throw new Error('An account with this email or phone number already exists.')
  }

  const newUser: UserAccount = {
    id: crypto.randomUUID(),
    email,
    phone,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  saveLocalUsers(users);

  // Async sync to Supabase DB
  void (async () => {

    try {
      const supabase = await createClient()
      await supabase.from('local_users').upsert({
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        password_hash: newUser.passwordHash,
        created_at: newUser.createdAt,
      })
    } catch {
      // Ignore
    }
  })()

  return newUser

}

export async function authenticateLocalUserAsync(identifier: string, password: string): Promise<UserAccount | null> {
  const normalized = normalizeIdentifier(identifier)
  const hash = hashPassword(password)

  // 1. Try local disk memory users
  const localUser = authenticateLocalUser(identifier, password)
  if (localUser) return localUser

  // 2. Try Supabase DB local_users table (crucial for Vercel deployments)
  try {
    const supabase = await createClient()
    let query = supabase.from('local_users').select('*').eq('password_hash', hash)
    if (normalized.includes('@')) {
      query = query.eq('email', normalized)
    } else {
      query = query.eq('phone', normalized)
    }

    const { data: dbRows } = await query
    if (dbRows && dbRows.length > 0) {
      const dbUser = dbRows[0]
      return {
        id: dbUser.id,
        email: dbUser.email,
        phone: dbUser.phone,
        passwordHash: dbUser.password_hash,
        createdAt: dbUser.created_at,
      }
    }
  } catch (err) {
    // Supabase DB connection skipped
  }

  return null
}

export function authenticateLocalUser(identifier: string, password: string): UserAccount | null {
  const users = getLocalUsers()
  const normalized = normalizeIdentifier(identifier)
  const hash = hashPassword(password)

  const user = users.find(
    (u) =>
      ((u.email && u.email.toLowerCase() === normalized) ||
        (u.phone && u.phone === normalized)) &&
      u.passwordHash === hash
  )

  return user || null
}

export async function updateLocalUserPasswordAsync(identifier: string, newPassword: string): Promise<boolean> {
  const normalized = normalizeIdentifier(identifier)
  const hash = hashPassword(newPassword)

  let updated = updateLocalUserPassword(identifier, newPassword)

  try {
    const supabase = await createClient()
    if (normalized.includes('@')) {
      await supabase.from('local_users').update({ password_hash: hash }).eq('email', normalized)
    } else {
      await supabase.from('local_users').update({ password_hash: hash }).eq('phone', normalized)
    }
    updated = true
  } catch (err) {
    // Ignore error
  }

  return updated
}

export function updateLocalUserPassword(identifier: string, newPassword: string): boolean {
  const users = getLocalUsers()
  const normalized = normalizeIdentifier(identifier)

  const userIndex = users.findIndex(
    (u) =>
      (u.email && u.email.toLowerCase() === normalized) ||
      (u.phone && u.phone === normalized)
  )

  if (userIndex === -1) {
    return false
  }

  users[userIndex].passwordHash = hashPassword(newPassword)
  saveLocalUsers(users)
  return true
}

