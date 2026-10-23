import { db } from '../db/index.js'
import {
  ALL_PERMISSION_NAMES,
  PERMISSION_BY_NAME,
  PERMISSION_CATALOGUE,
  ROLE_PERMISSION_MATRIX,
} from '../config/permissions.js'

/**
 * Insert any catalogue permission that is missing and refresh its label and
 * group. Existing rows keep their identifier so granted links stay valid.
 */
export function ensurePermissionCatalogue(): void {
  const upsert = db.prepare(
    `INSERT INTO permissions (name, label, group_name) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET label = excluded.label, group_name = excluded.group_name`,
  )
  for (const permission of PERMISSION_CATALOGUE) {
    upsert.run(permission.name, permission.label, permission.group)
  }
}

/**
 * Permissions held by a user, combining direct grants (`permission_user`)
 * with grants inherited through their roles (`permission_role`).
 *
 * `super_admin` and `developer` bypass every check, mirroring
 * `HasRoles::hasPermission()` and the `Gate::before()` hook of the Laravel
 * reference implementation.
 */
export function loadUserPermissions(userId: number, roles: string[] = []): string[] {
  if (roles.includes('super_admin') || roles.includes('developer')) return [...ALL_PERMISSION_NAMES]

  const rows = db
    .prepare(
      `SELECT DISTINCT p.name AS name
       FROM permissions p
       LEFT JOIN permission_user pu ON pu.permission_id = p.id AND pu.user_id = ?
       LEFT JOIN permission_role pr ON pr.permission_id = p.id
       LEFT JOIN user_roles ur ON ur.role_id = pr.role_id AND ur.user_id = ?
       WHERE pu.user_id IS NOT NULL OR ur.user_id IS NOT NULL`,
    )
    .all(userId, userId) as Array<{ name: string }>

  return rows.map((row) => row.name)
}

export function listPermissions(): Array<{ id: number; name: string; label: string | null; group_name: string | null }> {
  return db
    .prepare('SELECT id, name, label, group_name FROM permissions ORDER BY group_name, name')
    .all() as Array<{ id: number; name: string; label: string | null; group_name: string | null }>
}

export function rolePermissionNames(roleId: number): string[] {
  const rows = db
    .prepare(
      `SELECT p.name AS name
       FROM permission_role pr JOIN permissions p ON p.id = pr.permission_id
       WHERE pr.role_id = ? ORDER BY p.name`,
    )
    .all(roleId) as Array<{ name: string }>
  return rows.map((row) => row.name)
}

/**
 * Grant a permission straight to a user (the Laravel `permission_user`
 * pivot). Super admins already hold every permission implicitly.
 */
export function grantUserPermission(userId: number, permission: string): boolean {
  const row = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permission) as { id: number } | undefined
  if (!row) return false
  db.prepare('INSERT OR IGNORE INTO permission_user (permission_id, user_id) VALUES (?, ?)').run(row.id, userId)
  return true
}

export function revokeUserPermission(userId: number, permission: string): boolean {
  const row = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permission) as { id: number } | undefined
  if (!row) return false
  db.prepare('DELETE FROM permission_user WHERE permission_id = ? AND user_id = ?').run(row.id, userId)
  return true
}

export function userPermissionNames(userId: number): string[] {
  const rows = db
    .prepare(
      `SELECT p.name AS name
       FROM permission_user pu JOIN permissions p ON p.id = pu.permission_id
       WHERE pu.user_id = ? ORDER BY p.name`,
    )
    .all(userId) as Array<{ name: string }>
  return rows.map((row) => row.name)
}

/**
 * Bring the stored role grants in line with the reference role matrix.
 *
 * `sync` mirrors Laravel's `$role->permissions()->sync($ids)`: the role ends
 * up with exactly the listed permissions and nothing else.
 */
export function syncRolePermissionMatrix(): void {
  const permissionId = db.prepare('SELECT id FROM permissions WHERE name = ?')
  const roleId = db.prepare('SELECT id FROM roles WHERE name = ?')
  const link = db.prepare('INSERT OR IGNORE INTO permission_role (permission_id, role_id) VALUES (?, ?)')

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleRow = roleId.get(role) as { id: number } | undefined
    if (!roleRow) continue

    const desired = permissions
      .map((name) => permissionId.get(name) as { id: number } | undefined)
      .filter((row): row is { id: number } => !!row)
      .map((row) => row.id)

    db.prepare('DELETE FROM permission_role WHERE role_id = ?').run(roleRow.id)
    for (const id of desired) link.run(id, roleRow.id)
  }
}

/**
 * Add any matrix permission that is missing without removing grants an
 * administrator added by hand. Used on every boot after the first sync.
 */
export function ensureRolePermissionMatrix(): void {
  const permissionId = db.prepare('SELECT id FROM permissions WHERE name = ?')
  const roleId = db.prepare('SELECT id FROM roles WHERE name = ?')
  const link = db.prepare('INSERT OR IGNORE INTO permission_role (permission_id, role_id) VALUES (?, ?)')

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleRow = roleId.get(role) as { id: number } | undefined
    if (!roleRow) continue
    for (const name of permissions) {
      const permissionRow = permissionId.get(name) as { id: number } | undefined
      if (permissionRow) link.run(permissionRow.id, roleRow.id)
    }
  }
}

/**
 * Carry grants over from the pre-conversion `role_permissions` table.
 *
 * The legacy table stored bare names, sometimes with a wildcard suffix such
 * as `transactions.*`. Exact names map to a single permission, wildcards map
 * to every permission in the matching group.
 */
export function migrateLegacyRolePermissions(): void {
  const hasLegacy = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'role_permissions'")
    .get() as { name: string } | undefined
  if (!hasLegacy) return

  const legacyRows = db.prepare('SELECT role_id, permission FROM role_permissions').all() as Array<{
    role_id: number
    permission: string
  }>

  const permissionId = db.prepare('SELECT id FROM permissions WHERE name = ?')
  const link = db.prepare('INSERT OR IGNORE INTO permission_role (permission_id, role_id) VALUES (?, ?)')

  for (const row of legacyRows) {
    const raw = String(row.permission ?? '').trim()
    if (!raw) continue

    if (raw.endsWith('*')) {
      const group = raw.slice(0, -1).replace(/\.$/, '')
      const groupRows = db
        .prepare('SELECT id FROM permissions WHERE group_name = ?')
        .all(group) as Array<{ id: number }>
      for (const permissionRow of groupRows) link.run(permissionRow.id, row.role_id)
      continue
    }

    const permissionRow = permissionId.get(raw) as { id: number } | undefined
    if (permissionRow) link.run(permissionRow.id, row.role_id)
  }
}

export function dropLegacyRolePermissions(): void {
  db.exec('DROP TABLE IF EXISTS role_permissions')
}

export { PERMISSION_BY_NAME }
