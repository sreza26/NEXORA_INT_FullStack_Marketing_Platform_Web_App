import type { Request } from 'express'
import { Readable } from 'node:stream'
import { HttpError } from './error.js'

export interface UploadedFile {
  field: string
  filename: string
  mimeType: string
  data: Buffer
  size: number
}

export interface ParsedForm {
  fields: Record<string, string>
  files: UploadedFile[]
}

/**
 * Multipart form parser.
 *
 * Uses the runtime's built-in `Request.formData()` so the platform does not
 * need an extra dependency. The raw request stream is still intact at this
 * point because the JSON and urlencoded body parsers skip
 * `multipart/form-data` payloads.
 */
export async function parseMultipart(
  req: Request,
  options: { maxFileBytes?: number; maxRequestBytes?: number } = {},
): Promise<ParsedForm> {
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new HttpError(415, 'A multipart/form-data request is required.')
  }

  const maxFileBytes = options.maxFileBytes ?? 4 * 1024 * 1024
  const maxRequestBytes = options.maxRequestBytes ?? 10 * 1024 * 1024

  const declaredLength = Number(req.headers['content-length'] ?? 0)
  if (declaredLength > maxRequestBytes) {
    throw new HttpError(413, 'The uploaded files are too large.')
  }

  const body = Readable.toWeb(req)
  const webRequest = new Request('http://localhost/upload', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: body as any,
    duplex: 'half',
  } as any)

  let form: FormData
  try {
    form = await webRequest.formData()
  } catch {
    throw new HttpError(422, 'The uploaded form could not be read.')
  }

  const fields: Record<string, string> = {}
  const files: UploadedFile[] = []

  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') {
      fields[key] = value
      continue
    }

    const buffer = Buffer.from(await value.arrayBuffer())
    if (buffer.length > maxFileBytes) {
      throw new HttpError(413, 'Each uploaded file must be 4 MB or smaller.')
    }

    files.push({
      field: key,
      filename: value.name || 'upload',
      mimeType: value.type || 'application/octet-stream',
      data: buffer,
      size: buffer.length,
    })
  }

  return { fields, files }
}
