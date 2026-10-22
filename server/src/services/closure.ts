import { db } from '../db/index.js'

const MAX_DEPTH = 50

/**
 * Store the ancestor chain of a member. The direct sponsor is stored with
 * depth 0, the next sponsor up with depth 1 and so on, which matches the
 * generation numbering used by the member network endpoints.
 */
export function linkReferralClosures(memberId: number): number {
  const member = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(memberId) as
    | { sponsor_id: number | null }
    | undefined
  if (!member) return 0

  const insert = db.prepare(
    'INSERT OR REPLACE INTO referral_closures (ancestor_id, descendant_id, depth) VALUES (?, ?, ?)',
  )

  let current = member.sponsor_id ?? null
  let depth = 0
  let written = 0

  while (current !== null && depth < MAX_DEPTH) {
    if (current === memberId) break
    insert.run(current, memberId, depth)
    written += 1

    const next = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(current) as
      | { sponsor_id: number | null }
      | undefined
    const sponsorId = next?.sponsor_id ?? null
    if (sponsorId === current) break
    current = sponsorId
    depth += 1
  }

  return written
}

/** Rebuild the whole closure table from the current sponsor links. */
export function rebuildAllReferralClosures(): number {
  db.exec('DELETE FROM referral_closures')

  const members = db.prepare('SELECT id FROM users ORDER BY id ASC').all() as unknown as Array<{ id: number }>
  let written = 0
  for (const member of members) {
    written += linkReferralClosures(member.id)
  }
  return written
}

/** Drop every closure row that references a member. */
export function removeMemberClosures(memberId: number): void {
  db.prepare('DELETE FROM referral_closures WHERE descendant_id = ? OR ancestor_id = ?').run(memberId, memberId)
}
