import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './error.js'

/**
 * Permission guard.
 *
 * Mirrors the Laravel `EnsurePermission` middleware: the request is rejected
 * with HTTP 403 and the reference message when the signed-in account does not
 * hold the required permission.
 *
 * Super admins hold every permission implicitly (see `loadUserPermissions`),
 * so they pass every guard without needing a wildcard entry.
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) {
      next(new HttpError(401, 'Authentication required'))
      return
    }

    const granted = user.permissions ?? []
    const allowed = permissions.some((permission) => granted.includes(permission))

    if (!allowed) {
      next(new HttpError(403, 'You do not have permission to perform this action.'))
      return
    }

    next()
  }
}

/**
 * Guard for endpoints where the required permission depends on the request
 * body (for example approving versus paying a withdrawal). The callback
 * receives the request and returns the permission name to check.
 */
export function requireResolvedPermission(resolve: (req: Request) => string | null) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) {
      next(new HttpError(401, 'Authentication required'))
      return
    }

    const permission = resolve(req)
    if (!permission) {
      next(new HttpError(422, 'The requested action is not supported.'))
      return
    }

    const granted = user.permissions ?? []
    if (!granted.includes(permission)) {
      next(new HttpError(403, 'You do not have permission to perform this action.'))
      return
    }

    next()
  }
}

export function hasPermission(granted: string[] | undefined, permission: string): boolean {
  return !!granted && granted.includes(permission)
}
