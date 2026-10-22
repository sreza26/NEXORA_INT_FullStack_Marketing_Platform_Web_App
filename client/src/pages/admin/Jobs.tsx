import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function Jobs() {
  usePageTitle('Scheduled Jobs')
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [jobNames, setJobNames] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [jobFilter, setJobFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function load() {
    try {
      const params = new URLSearchParams()
      if (jobFilter) params.set('job', jobFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      const res = await api.get(`/admin/jobs?${params.toString()}`)
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setJobNames(res.data?.jobNames ?? [])
      setStatuses(res.data?.statuses ?? [])
      setTotalPages(res.data?.totalPages ?? 1)
      setPage(res.data?.page ?? page)
    } catch {
      // fail silently
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <div>
        <h1 className="page-title">Scheduled job monitor</h1>
        <p className="section-sub">Every scheduler run is recorded with status, duration and processed counts.</p>
      </div>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); load() }}
      >
        <div>
          <label className="label" htmlFor="job">Job</label>
          <select
            className="input"
            id="job"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="">All jobs</option>
            {jobNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select
            className="input"
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="#" onClick={(e) => { e.preventDefault(); setJobFilter(''); setStatusFilter(''); load() }} className="btn btn-ghost">Reset</a>
        <p className="hint w-full">Runs of this scheduled job only.</p>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

      <div className="mt-6 card card-pad">
        <div className="table-wrap">
          {items.length === 0 ? (
            <div className="text-center text-sm text-slate-400">No job runs match your filters.</div>
          ) : (
            <Table
              align={['left', 'left', 'right', 'left', 'left', 'left', 'left', 'left']}
              head={[
                'Job',
                'Status',
                'Processed',
                'Started',
                'Finished',
                'Duration',
                'Host',
                'Error',
              ]}
              rows={items.map((i) => {
                const jobName = i.job_name ? String(i.job_name) : '—'
                const statusStr = i.status ? String(i.status) : '—'
                const processedStr = i.processed_count !== undefined && i.processed_count !== null ? String(i.processed_count) : '—'
                const startedStr = i.started_at
                  ? new Date(i.started_at.replace(' ', 'T')).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '—'
                const finishedStr = i.finished_at
                  ? new Date(i.finished_at.replace(' ', 'T')).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '—'
                let durationStr = '—'
                if (i.started_at && i.finished_at) {
                  const diff = Math.round(
                    (new Date(i.finished_at.replace(' ', 'T')).getTime() -
                      new Date(i.started_at.replace(' ', 'T')).getTime()) / 1000
                  )
                  durationStr = `${diff}s`
                }
                const hostStr = i.host ? String(i.host) : '—'
                const errorStr = i.error_message ? String(i.error_message) : '—'
                return [
                  <span key="job" className="font-mono text-xs font-semibold">{jobName}</span>,
                  <span key="status" className={`badge ${statusStr === 'success' ? 'badge-success' : statusStr === 'failed' ? 'badge-danger' : statusStr === 'running' ? 'badge-warn' : 'badge-muted'}`}>{statusStr}</span>,
                  <span key="proc" className="text-right tabular-nums">{processedStr}</span>,
                  <span key="start" className="text-sm text-slate-500">{startedStr}</span>,
                  <span key="finish" className="text-sm text-slate-500">{finishedStr}</span>,
                  <span key="dur" className="text-sm tabular-nums">{durationStr}</span>,
                  <span key="host" className="text-xs text-slate-400">{hostStr}</span>,
                  <span key="err" className="max-w-64 truncate text-xs text-red-600" title={errorStr}>{errorStr}</span>,
                ]
              })}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load() }}>Previous</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setPage(p); load() }}>{p}</button>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => { setPage(page + 1); load() }}>Next</button>
      </div>
      <div className="mt-2 text-xs text-slate-400 text-center">Page {page} of {totalPages} · {total} total</div>
    </>
  )
}
