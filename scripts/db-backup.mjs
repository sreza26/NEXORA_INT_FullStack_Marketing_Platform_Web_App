import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups')
fs.mkdirSync(BACKUP_DIR, { recursive: true })

const date = new Date().toISOString().slice(0, 10)
const file = path.join(BACKUP_DIR, `nexora-${date}.sql`)

if (fs.existsSync(file)) {
  console.log(`[backup] file already exists: ${file}`)
  process.exit(0)
}

const host = process.env.DB_HOST || 'localhost'
const port = process.env.DB_PORT || '3306'
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const db = process.env.DB_NAME

const cmd = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${db} > "${file}"`

try {
  execSync(cmd, { stdio: 'inherit' })
  console.log(`[backup] written ${file}`)

  // optional: git add & commit (requires git creds)
  // execSync(`git add "${file}" && git commit -m "daily backup ${date}"`, { cwd: path.resolve(__dirname, '..') })
} catch (e) {
  console.error('[backup] failed:', e.message)
  process.exit(1)
}