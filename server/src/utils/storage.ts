import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config/index.js'

/**
 * Private file storage for verification documents.
 *
 * The Laravel reference keeps uploads on the `local` disk and serves them
 * through an authorised route (`/files/verification/{path}`) that checks the
 * requester owns the file or holds the `members.view` permission. Documents
 * are never exposed through a public URL.
 *
 * This module mirrors that layout: files live under
 * `storage/uploads/users/{userId}/verification/...` and the stored value is
 * always a relative path.
 */

export const VERIFICATION_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
export const SELFIE_MIME_TYPES = ['image/jpeg', 'image/png']
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
}

export interface StoredFile {
  /** Relative path, for example `users/12/verification/8f2c....png`. */
  path: string
  absolutePath: string
  size: number
}

function ensureInside(root: string, target: string): string | null {
  const resolved = path.resolve(root, target)
  const normalizedRoot = path.resolve(root)
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) return null
  return resolved
}

export function storeVerificationDocument(options: {
  userId: number
  data: Buffer
  mimeType: string
}): StoredFile {
  const extension = EXTENSION_BY_MIME[options.mimeType]
  if (!extension) throw new Error('Unsupported document type')

  const folder = `users/${options.userId}/verification`
  const directory = ensureInside(config.uploadsDir, folder)
  if (!directory) throw new Error('Invalid storage path')
  fs.mkdirSync(directory, { recursive: true })

  const filename = `${crypto.randomBytes(20).toString('hex')}${extension}`
  const relativePath = `${folder}/${filename}`
  const absolutePath = ensureInside(config.uploadsDir, relativePath)!
  fs.writeFileSync(absolutePath, options.data)

  return { path: relativePath, absolutePath, size: options.data.length }
}

/**
 * Resolve a stored relative path to an absolute one, refusing anything that
 * escapes the upload root.
 */
export function resolveStoredPath(relativePath: string): string | null {
  const decoded = decodeURIComponent(relativePath).replace(/^\/+/, '')
  if (!decoded) return null
  return ensureInside(config.uploadsDir, decoded)
}

export function storedFileExists(relativePath: string): boolean {
  const absolute = resolveStoredPath(relativePath)
  if (!absolute) return false
  try {
    return fs.statSync(absolute).isFile()
  } catch {
    return false
  }
}

export function deleteStoredFile(relativePath: string): void {
  const absolute = resolveStoredPath(relativePath)
  if (!absolute) return
  try {
    fs.rmSync(absolute, { force: true })
  } catch {
    // A missing file is not an error when cleaning up.
  }
}
