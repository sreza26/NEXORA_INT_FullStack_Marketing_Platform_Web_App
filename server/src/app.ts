import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config, serverRoot } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middlewares/error.js'

export function createApp() {
  const app = express()

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  )
  app.use(compression())
  app.use(cors({ origin: config.clientOrigins, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: config.env, time: new Date().toISOString() })
  })

  app.use('/api', routes)

  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }))

  const clientDist = path.resolve(serverRoot, '..', 'client', 'dist')
  app.use(express.static(clientDist, { index: false }))
  app.get(/^\/(?!api|health|uploads).*/, (_req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next()
    })
  })

  app.use(notFound)
  app.use(errorHandler)

  return app
}
