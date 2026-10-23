import { createApp } from './app.js'
import { config } from './config/index.js'
import { serverPaths } from './db/index.js'
import { seed } from './db/seed.js'

await seed()

const app = createApp()

app.listen(config.port, () => {
  const { database } = serverPaths()
  console.log(`[nexora] API listening on http://localhost:${config.port}`)
  console.log(`[nexora] database: ${database}`)
})
