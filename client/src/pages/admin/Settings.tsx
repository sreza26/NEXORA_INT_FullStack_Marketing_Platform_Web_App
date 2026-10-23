import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

type Toggle = {
  key: string
  label: string
  description?: string | null
  env?: string | null
  enabled: boolean
}

type SettingsData = {
  toggles: Toggle[]
  rawConfig: Record<string, string | boolean | number>
}

type DemoReport = {
  demo: boolean
  users: number
  transactions: number
  [key: string]: number | boolean
}

const EMPTY: SettingsData = { toggles: [], rawConfig: {} }

export default function Settings() {
  usePageTitle('Settings')
  const [data, setData] = useState<SettingsData>(EMPTY)
  const [saving, setSaving] = useState<string | null>(null)
  const [demo, setDemo] = useState<DemoReport | null>(null)
  const [confirm, setConfirm] = useState('')
  const [demoMessage, setDemoMessage] = useState('')
  const [purging, setPurging] = useState(false)

  const load = useCallback(() => {
    return api
      .get('/admin/settings')
      .then((res) => {
        const d = res.data as Partial<SettingsData>
        setData({
          toggles: Array.isArray(d.toggles) ? d.toggles : [],
          rawConfig: d.rawConfig && typeof d.rawConfig === 'object' ? d.rawConfig : {},
        })
      })
      .catch(() => undefined)
  }, [])

  const loadDemo = useCallback(() => {
    return api
      .get('/admin/demo-data')
      .then((res) => setDemo(res.data as DemoReport))
      .catch(() => setDemo(null))
  }, [])

  useEffect(() => {
    load()
    loadDemo()
  }, [load, loadDemo])

  const purgeDemo = async () => {
    setPurging(true)
    setDemoMessage('')
    try {
      const res = await api.delete('/admin/demo-data', { data: { confirm } })
      setDemoMessage(res.data?.deleted ? 'Demo data deleted.' : 'No demo data found.')
      setConfirm('')
      await loadDemo()
    } catch (error: any) {
      setDemoMessage(error.response?.data?.message ?? 'Unable to delete demo data.')
    } finally {
      setPurging(false)
    }
  }

  /**
   * The admin settings endpoint is `PUT /api/admin/settings` and expects a
   * flat `{ "<setting key>": "<value>" }` payload — the same key/value pairs
   * the Laravel `admin.settings.update` form posts.
   */
  const handleUpdate = async (key: string, enabled: boolean) => {
    setSaving(key)
    try {
      await api.put('/admin/settings', { [key]: enabled ? '1' : '0' })
      await load()
    } catch {
      await load()
    } finally {
      setSaving(null)
    }
  }

  const raw = data.rawConfig

  return (
    <>
      <div>
        <h1 className="page-title">Application settings</h1>
        <p className="section-sub">
          Enable or disable platform features from one place. Each switch lives in the database and overrides the <span className="font-mono text-xs">.env</span> / config default for every user.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="stat-card">
          <span className="stat-label">Deposits enabled</span>
          <span className="stat-value text-lg">{raw['deposits_enabled'] ? 'Yes' : 'No'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Commission base</span>
          <span className="stat-value text-sm font-mono">{String(raw['commission_base'] ?? '')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Currency</span>
          <span className="stat-value text-lg">{String(raw['currency'] ?? '')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Timezone</span>
          <span className="stat-value text-sm">{String(raw['timezone'] ?? '')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Profit share</span>
          <span className="stat-value text-lg">{raw['profit_share_enabled'] ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="card card-pad mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="font-bold text-navy-900">Feature toggles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tick or untick a box, then click <span className="font-medium text-navy-900">Save</span> to apply it — the database value overrides the <span className="font-mono text-xs">.env</span> / config default for every user.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.toggles.map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
            >
              <div className="min-w-0">
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="text-sm font-medium text-navy-900">{toggle.label}</span>
                  <span className={`badge ${toggle.enabled ? 'badge-success' : 'badge-muted'}`}>
                    {toggle.enabled ? 'on' : 'off'}
                  </span>
                </label>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{toggle.key}</p>
                {toggle.description ? <p className="hint">{toggle.description}</p> : null}
                {toggle.env ? (
                  <p className="hint">
                    Overrides <span className="font-mono">{toggle.env}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer accent-cyan-500"
                  aria-label={`Toggle ${toggle.label}`}
                  checked={toggle.enabled}
                  disabled={saving === toggle.key}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      toggles: prev.toggles.map((t) => (t.key === toggle.key ? { ...t, enabled: e.target.checked } : t)),
                    }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving === toggle.key}
                  onClick={() => handleUpdate(toggle.key, toggle.enabled)}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad mt-6">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-rose-500" />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-navy-900">Demo data</h2>
            <p className="mt-1 text-sm text-slate-500">
              Removes the seeded <span className="font-mono text-xs">@demo.test</span> members, their network, wallets,
              profiles and the synthetic <span className="font-mono text-xs">DEMO-*</span> business transactions. Real
              members are untouched. Developers can also do this from the system debug panel.
            </p>

            {demoMessage && <p className="flash-ok mt-3">{demoMessage}</p>}

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>
                Demo members: <span className="font-semibold text-navy-900">{demo?.users ?? 0}</span>
              </span>
              <span>
                Demo transactions: <span className="font-semibold text-navy-900">{demo?.transactions ?? 0}</span>
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <label className="label" htmlFor="demo-confirm">
                  Type DELETE to confirm
                </label>
                <input
                  id="demo-confirm"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={purging || confirm !== 'DELETE' || !demo?.demo}
                onClick={purgeDemo}
              >
                <Trash2 className="h-4 w-4" /> {purging ? 'Deleting…' : 'Delete demo data'}
              </button>
            </div>
            {demo && !demo.demo && <p className="hint">No demo data is present.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
