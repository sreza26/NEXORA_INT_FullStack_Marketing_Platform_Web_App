import { closeDb } from '../src/db/index.js'
import { seed } from '../src/db/seed.js'

await seed()
await closeDb()
console.log('[nexora] seed complete')
