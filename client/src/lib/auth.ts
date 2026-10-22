import { useEffect, useState } from 'react'

export interface AuthUser {
  id: number
  name: string
  email: string
  member_code?: string
  role?: string
  roles?: string[]
  permissions?: string[]
  is_admin?: boolean
  verification_status?: string
  current_rank?: { name: string } | null
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('nexora_user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem('nexora_user')
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
