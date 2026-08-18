import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { normalizeIdentifier, detectIdentifierType } from '@/lib/otp'

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
    console.error('Error creating local auth storage directory:', err)
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function getLocalUsers(): UserAccount[] {
  ensureStorageDir()
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf-8')
    return JSON.parse(content) || []
  } catch (err) {
    return []
  }
}

export function saveLocalUsers(users: UserAccount[]) {
  ensureStorageDir()
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing local users:', err)
  }
}

export function createLocalUser(identifier: string, phoneInput: string, password: string): UserAccount {
  const users = getLocalUsers()
  const normalized = normalizeIdentifier(identifier)
  const type = detectIdentifierType(normalized)

  const email = type === 'email' ? normalized : undefined
  const phone = type === 'phone' ? normalized : (phoneInput ? normalizeIdentifier(phoneInput) : undefined)

  // Check if existing
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
  saveLocalUsers(users)
  return newUser
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
