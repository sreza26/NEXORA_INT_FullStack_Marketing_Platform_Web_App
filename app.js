process.env.NODE_ENV ??= 'production'

import('./server/dist/server.js').catch((error) => {
  console.error('[nexora] failed to start the server', error)
  process.exit(1)
})
