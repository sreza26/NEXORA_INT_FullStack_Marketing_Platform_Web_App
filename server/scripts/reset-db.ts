import fs from 'fs'
import path from 'path'
import { config } from '../src/config/index.js'

const target = path.resolve(config.databaseFile)
for (const suffix of ['', '-wal', '-shm']) {
  const file = `${target}${suffix}`
  if (fs.existsSync(file)) {
    fs.rmSync(file)
    console.log(`[nexora] removed ${file}`)
  }
}
console.log('[nexora] database reset — run the seed script next')
