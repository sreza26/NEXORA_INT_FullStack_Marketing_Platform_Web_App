import { config } from '../src/config/index.js'
import { closeDb, db } from '../src/db/index.js'

if (config.env !== 'test' && process.env.FORCE_RESET !== '1') {
  console.error('[nexora] refusing to reset a non-test database; set FORCE_RESET=1 to continue')
  process.exit(1)
}

const tables = await db.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
)

await db.exec('SET FOREIGN_KEY_CHECKS = 0')
for (const { table_name } of tables) {
  await db.exec(`DROP TABLE IF EXISTS \`${table_name}\``)
}
await db.exec('SET FOREIGN_KEY_CHECKS = 1')

await closeDb()
console.log(`[nexora] dropped ${tables.length} tables - run the seed script next`)
