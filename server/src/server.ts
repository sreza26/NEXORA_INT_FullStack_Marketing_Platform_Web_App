import { createApp } from './app.js'
import { config } from './config/index.js'
import { migrate, serverPaths } from './db/index.js'
import { seed } from './db/seed.js'

migrate()
seed()

const app = createApp()

app.listen(config.port, () => {
  const { databaseFile } = serverPaths()
  console.log(`[nexora] API listening on http://localhost:${config.port}`)
  console.log(`[nexora] database: ${databaseFile}`)
})
