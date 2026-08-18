import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { Task } from '@/types/task'

export interface UserTasksData {
  tasks: Task[]
  xp: number
  streak: number
  bestStreak: number
  lastCompletedDate: string | null
  badges: string[]
  updatedAt?: string
}

const DATA_DIR = path.join(process.cwd(), '.data')

function sanitizeUserId(userId: string): string {
  return userId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_')
}

function getUserFilePath(userId: string): string {
  const sanitized = sanitizeUserId(userId)
  return path.join(DATA_DIR, `tasks_${sanitized}.json`)
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch (err) {
    console.error('Error creating data directory:', err)
  }
}

/**
 * Retrieves the user's tasks and stats from server storage (Disk file + Supabase DB fallback/sync).
 */
export async function getUserTasksServer(userId: string): Promise<UserTasksData | null> {
  if (!userId) return null
  ensureDataDir()

  let data: UserTasksData | null = null

  // 1. Try fetching from disk file storage
  try {
    const filePath = getUserFilePath(userId)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      data = JSON.parse(content)
    }
  } catch (err) {
    console.warn(`[Task Store] Disk read failed for user ${userId}:`, err)
  }

  // 2. Try fetching from Supabase DB if available
  try {
    const supabase = await createClient()
    const { data: dbRow, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!error && dbRow) {
      const dbData: UserTasksData = {
        tasks: dbRow.tasks || [],
        xp: dbRow.xp || 0,
        streak: dbRow.streak || 0,
        bestStreak: dbRow.best_streak || 0,
        lastCompletedDate: dbRow.last_completed_date || null,
        badges: dbRow.badges || [],
        updatedAt: dbRow.updated_at,
      }

      // If DB has newer data or disk was empty, use DB data
      if (!data || (dbData.updatedAt && new Date(dbData.updatedAt) > new Date(data.updatedAt || 0))) {
        data = dbData
      }
    }
  } catch (err) {
    // Supabase optional fallback
  }

  return data
}

/**
 * Persists the user's tasks and stats to server storage (Disk file + Supabase DB sync).
 */
export async function saveUserTasksServer(
  userId: string,
  payload: UserTasksData
): Promise<boolean> {
  if (!userId) return false
  ensureDataDir()

  const dataToSave: UserTasksData = {
    ...payload,
    updatedAt: new Date().toISOString(),
  }

  let savedLocal = false

  // 1. Save to server disk file
  try {
    const filePath = getUserFilePath(userId)
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8')
    savedLocal = true
  } catch (err) {
    console.error(`[Task Store] Disk save failed for user ${userId}:`, err)
  }

  // 2. Sync to Supabase DB table user_tasks
  try {
    const supabase = await createClient()
    await supabase.from('user_tasks').upsert({
      user_id: userId,
      tasks: dataToSave.tasks,
      xp: dataToSave.xp,
      streak: dataToSave.streak,
      best_streak: dataToSave.bestStreak,
      last_completed_date: dataToSave.lastCompletedDate,
      badges: dataToSave.badges,
      updated_at: dataToSave.updatedAt,
    })
  } catch (err) {
    // Supabase optional fallback
  }

  return savedLocal
}
