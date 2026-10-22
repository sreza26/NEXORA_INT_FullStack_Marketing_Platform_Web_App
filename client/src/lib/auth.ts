import { useEffect, useState } from 'react'

export interface AuthUser {
  id: number
  name: string
  email: string
  member_code?: string
  role?: string
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
