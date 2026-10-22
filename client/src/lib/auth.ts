import { useEffect, useState } from 'react'

export interface AuthUser {
  id: number
  name: string
  email: string
  member_code?: string
  role?: string
  roles?: string[]
  role_labels?: string[]
  permissions?: string[]
  is_admin?: boolean
  verification_status?: string
  current_rank?: { id: number; name: string } | null
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('nexora_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem('nexora_user')
    return null
  }
}

export function useAuth() {
  // Read synchronously so the first paint already knows who is signed in and
  // the sidebar renders the right navigation without a flash.
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('nexora_user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem('nexora_user')
        setUser(null)
      }
    }
    setLoading(false)
  }, [])

  return { user, loading }
}

/**
 * Check a permission against the signed-in account.
 *
 * Super admins hold every permission implicitly, matching the server side
 * guard in `server/src/middlewares/permissions.ts`.
 */
export function hasPermission(user: AuthUser | null | undefined, permission?: string): boolean {
  if (!permission) return true
  if (!user) return false
  if ((user.roles ?? []).includes('super_admin')) return true
  return (user.permissions ?? []).includes(permission)
}

/** True when the account holds at least one of the listed permissions. */
export function hasAnyPermission(user: AuthUser | null | undefined, permissions: string[]): boolean {
  if (!user) return false
  if ((user.roles ?? []).includes('super_admin')) return true
  const granted = user.permissions ?? []
  return permissions.some((permission) => granted.includes(permission))
}
