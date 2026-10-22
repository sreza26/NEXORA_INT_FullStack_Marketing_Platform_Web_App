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

const EMPTY: SettingsData = { toggles: [], rawConfig: {} }

export default function Settings() {
  usePageTitle('Settings')
  const [data, setData] = useState<SettingsData>(EMPTY)
  const [saving, setSaving] = useState<string | null>(null)

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

  useEffect(() => {
    load()
  }, [load])

  /**
   * The admin settings endpoint is `PUT /api/admin/settings` and expects a
   * flat `{ "<setting key>": "<value>" }` payload — the same key/value pairs
   * the Laravel `admin.settings.update` form posts.
   */
  const handleUpdate = async (key: string, enabled: boolean) => {
    setSaving(key)
    try {
      await api.put('/admin/settings', { [key]: enabled ? '1' : '0' })
      setData((prev) => ({
        ...prev,
        toggles: prev.toggles.map((toggle) => (toggle.key === key ? { ...toggle, enabled } : toggle)),
      }))
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
                  onChange={(e) => handleUpdate(toggle.key, e.target.checked)}
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
    </>
  )
}
