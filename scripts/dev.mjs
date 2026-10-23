import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const useCli = fs.existsSync(npmCli)
const children = []
let shuttingDown = false

function run(args) {
  const child = useCli
    ? spawn(process.execPath, [npmCli, ...args], { stdio: 'inherit', env: process.env })
    : spawn('npm', args, { stdio: 'inherit', env: process.env })
  children.push(child)
  return child
}

function stopTree(child) {
  if (!child || child.killed || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    child.kill('SIGTERM')
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) stopTree(child)
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function waitForApi(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch {
      // The API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

console.log('[nexora] starting API on http://127.0.0.1:5000 ...')

const api = run(['run', 'dev', '--workspace=server'])
api.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[nexora] API exited with code ${code ?? 1}`)
    shutdown(code ?? 1)
  }
})

if (!(await waitForApi('http://127.0.0.1:5000/health', 120_000))) {
  console.error('[nexora] API did not become ready in time. Check the server output above.')
  shutdown(1)
}

console.log('[nexora] API is ready, starting the client on http://localhost:5173 ...')

const client = run(['run', 'dev', '--workspace=client'])
client.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[nexora] client exited with code ${code ?? 1}`)
    shutdown(code ?? 1)
  }
})
