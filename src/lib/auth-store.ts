import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { normalizeIdentifier, detectIdentifierType, emailMatches, phoneMatches } from '@/lib/otp-utils'
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
  const existingIndex = users.findIndex((u) => (email && emailMatches(u.email, email)) || (phone && phoneMatches(u.phone, phone)))
  if (existingIndex !== -1) {
    users[existingIndex].passwordHash = hashPassword(password)
    saveLocalUsers(users)
  } else {
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
    (u) => (email && emailMatches(u.email, email)) || (phone && phoneMatches(u.phone, phone))
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
  const isEmail = normalized.includes('@')
  const hash = hashPassword(password)

  // 1. Try local disk memory users
  const localUser = authenticateLocalUser(identifier, password)
  if (localUser) return localUser

  // 2. Try Supabase DB local_users table (crucial for Vercel deployments)
  try {
    const supabase = await createClient()
    const { data: dbRows } = await supabase.from('local_users').select('*').eq('password_hash', hash)
    if (dbRows && dbRows.length > 0) {
      const dbUser = dbRows.find((r: any) =>
        (isEmail && emailMatches(r.email, normalized)) ||
        (!isEmail && phoneMatches(r.phone, normalized))
      )
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          phone: dbUser.phone,
          passwordHash: dbUser.password_hash,
          createdAt: dbUser.created_at,
        }
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
  const isEmail = normalized.includes('@')
  const hash = hashPassword(password)

  const user = users.find(
    (u) =>
      ((isEmail && emailMatches(u.email, normalized)) ||
        (!isEmail && phoneMatches(u.phone, normalized)) ||
        (u.email && emailMatches(u.email, normalized)) ||
        (u.phone && phoneMatches(u.phone, normalized))) &&
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
    const isEmail = normalized.includes('@')
    const { data: dbRows } = await supabase.from('local_users').select('*')
    if (dbRows && dbRows.length > 0) {
      const match = dbRows.find((r: any) =>
        (isEmail && emailMatches(r.email, normalized)) ||
        (!isEmail && phoneMatches(r.phone, normalized))
      )
      if (match) {
        await supabase.from('local_users').update({ password_hash: hash }).eq('id', match.id)
      } else {
        await supabase.from('local_users').upsert({
          id: crypto.randomUUID(),
          email: isEmail ? normalized : null,
          phone: !isEmail ? normalized : null,
          password_hash: hash,
          created_at: new Date().toISOString(),
        })
      }
    } else {
      await supabase.from('local_users').upsert({
        id: crypto.randomUUID(),
        email: isEmail ? normalized : null,
        phone: !isEmail ? normalized : null,
        password_hash: hash,
        created_at: new Date().toISOString(),
      })
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
  const isEmail = normalized.includes('@')

  const userIndex = users.findIndex(
    (u) =>
      (isEmail && emailMatches(u.email, normalized)) ||
      (!isEmail && phoneMatches(u.phone, normalized)) ||
      (u.email && emailMatches(u.email, normalized)) ||
      (u.phone && phoneMatches(u.phone, normalized))
  )

  if (userIndex === -1) {
    const newUser: UserAccount = {
      id: crypto.randomUUID(),
      email: isEmail ? normalized : undefined,
      phone: !isEmail ? normalized : undefined,
      passwordHash: hashPassword(newPassword),
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
  } else {
    users[userIndex].passwordHash = hashPassword(newPassword)
  }

  saveLocalUsers(users)
  return true
}


