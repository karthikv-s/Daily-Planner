'use server'

import { getCurrentUser } from '@/app/auth/actions'
import { getUserTasksServer, saveUserTasksServer, UserTasksData } from '@/lib/task-store'

/**
 * Fetches user task data from server persistent store for cloud sync across devices.
 */
export async function fetchUserTasksAction(): Promise<{
  success: boolean
  data: UserTasksData | null
  userId: string | null
}> {
  try {
    const user = await getCurrentUser()
    const userId = user?.id || user?.identifier || null

    if (!userId) {
      return { success: false, data: null, userId: null }
    }

    const data = await getUserTasksServer(userId)
    return { success: true, data, userId }
  } catch (err) {
    console.error('[Tasks Action] Error fetching user tasks:', err)
    return { success: false, data: null, userId: null }
  }
}

/**
 * Saves user task state to server persistent store for cloud sync across devices.
 */
export async function syncUserTasksAction(
  payload: UserTasksData
): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser()
    const userId = user?.id || user?.identifier || null

    if (!userId) {
      return { success: false }
    }

    const success = await saveUserTasksServer(userId, payload)
    return { success }
  } catch (err) {
    console.error('[Tasks Action] Error syncing user tasks:', err)
    return { success: false }
  }
}
