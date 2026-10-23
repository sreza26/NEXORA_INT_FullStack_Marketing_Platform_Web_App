import 'express-async-errors'
import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import type { Request, Response } from 'express'
import { config, serverRoot } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middlewares/error.js'
import { authenticate } from './middlewares/auth.js'
import { resolveStoredPath, storedFileExists } from './utils/storage.js'

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

  // Verification documents are private. They are served through an
  // authenticated route that mirrors the Laravel reference: the requester
  // must either own the file or hold the `members.view` permission.
  app.get(/^\/files\/verification\/(.+)$/, authenticate, (req: Request, res: Response) => {
    const relativePath = String((req.params as Record<string, string>)[0] ?? '')
    const user = req.user!

    const isOwner = relativePath.includes(`users/${user.id}/`)
    const canReview = (user.permissions ?? []).includes('members.view')
    if (!isOwner && !canReview) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' })
      return
    }

    const absolutePath = resolveStoredPath(relativePath)
    if (!absolutePath || !storedFileExists(relativePath)) {
      res.status(404).json({ message: 'Endpoint not found' })
      return
    }

    res.sendFile(absolutePath)
  })

  const clientDist = path.resolve(serverRoot, '..', 'client', 'dist')
  app.use(express.static(clientDist, { index: false }))
  app.get(/^\/(?!api|health|uploads|files).*/, (_req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next()
    })
  })

  app.use(notFound)
  app.use(errorHandler)

  return app
}
