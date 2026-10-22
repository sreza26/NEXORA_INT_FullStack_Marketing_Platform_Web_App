import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Bell } from 'lucide-react'

interface Notification {
  id: number
  read_at?: string
  created_at: string
  data?: any
  type?: string
}

export default function Notifications() {
  usePageTitle('Notifications')
  const [notifications, setNotifications] = useState<Notification[]>([])

  async function load() {
    try {
      const res = await api.get('/member/notifications')
      setNotifications(res.data.notifications || [])
    } catch {
      setNotifications([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function markAll() {
    try {
      await api.post('/member/notifications/read-all')
      await load()
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="section-sub">Account, verification and payment alerts.</p>
        </div>
        <button onClick={markAll} className="btn btn-outline btn-sm">Mark all as read</button>
      </div>

      <div className="mt-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400">You have no notifications yet.</div>
        ) : (
          notifications.map((notification) => {
            const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data || {}
            return (
              <div key={notification.id} className={`card card-pad flex items-start gap-4 ${notification.read_at ? 'opacity-70' : ''}`}>
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.read_at ? 'bg-slate-100 text-slate-400' : 'bg-accent-500/10 text-accent-600'}`}>
                  <Bell className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-navy-900">{data.title || notification.type}</p>
                    <span className="text-xs text-slate-400">{notification.created_at ? new Date(notification.created_at.replace(' ', 'T')).toLocaleString() : ''}</span>
                  </div>
                  {data.message ? <p className="mt-1 text-sm text-slate-600">{data.message}</p> : null}
                </div>
                {!notification.read_at ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-500"></span> : null}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
