/**
 * Permission catalogue and role grant matrix.
 *
 * This mirrors the Laravel reference implementation exactly:
 *   database/seeders/RolePermissionSeeder.php
 *
 * The permission names, labels, groups and the per-role grants below are a
 * 1:1 copy of the reference seed so that the admin console menus, the route
 * guards and the audit trail line up with the original platform.
 *
 * `super_admin` is intentionally absent from the matrix: it bypasses every
 * permission check (mirroring `HasRoles::hasPermission()` and the
 * `Gate::before()` hook in the Laravel `AppServiceProvider`).
 */

export interface PermissionSpec {
  name: string
  label: string
  group: string
}

export const PERMISSION_CATALOGUE: PermissionSpec[] = [
  { name: 'members.view', label: 'View member directory and profiles', group: 'members' },
  { name: 'members.manage', label: 'Manage member accounts', group: 'members' },
  { name: 'members.verify_identity', label: 'Review identity verification documents', group: 'members' },
  { name: 'members.change_sponsor', label: 'Administratively correct sponsor relationships', group: 'members' },
  { name: 'members.suspend', label: 'Suspend or reactivate member accounts', group: 'members' },
  { name: 'transactions.view', label: 'View business transactions', group: 'transactions' },
  { name: 'transactions.create', label: 'Create business transactions', group: 'transactions' },
  { name: 'transactions.verify', label: 'Verify or reject business transactions', group: 'transactions' },
  { name: 'transactions.reverse', label: 'Reverse verified business transactions', group: 'transactions' },
  { name: 'plans.manage', label: 'Create and edit compensation plans', group: 'plans' },
  { name: 'plans.approve', label: 'Activate approved compensation plans', group: 'plans' },
  { name: 'commissions.view', label: 'View commission records', group: 'commissions' },
  { name: 'commissions.approve', label: 'Approve or reject commissions', group: 'commissions' },
  { name: 'commissions.pay', label: 'Mark approved commissions as paid', group: 'commissions' },
  { name: 'ranks.view', label: 'View rank configuration and reports', group: 'ranks' },
  { name: 'ranks.manage', label: 'Manage rank configuration', group: 'ranks' },
  { name: 'salary.view', label: 'View salary payouts', group: 'salary' },
  { name: 'salary.approve', label: 'Approve or reject salary payouts', group: 'salary' },
  { name: 'salary.pay', label: 'Pay approved salary payouts', group: 'salary' },
  { name: 'rewards.manage', label: 'Configure travel rewards', group: 'rewards' },
  { name: 'rewards.claims.review', label: 'Review reward claims', group: 'rewards' },
  { name: 'ledger.view', label: 'View wallet ledger entries', group: 'ledger' },
  { name: 'ledger.adjust', label: 'Post manual ledger adjustments', group: 'ledger' },
  { name: 'deposits.view', label: 'View deposit records', group: 'deposits' },
  { name: 'deposits.verify', label: 'Verify or reject deposits', group: 'deposits' },
  { name: 'withdrawals.view', label: 'View withdrawal requests', group: 'withdrawals' },
  { name: 'withdrawals.approve', label: 'Approve or reject withdrawals', group: 'withdrawals' },
  { name: 'withdrawals.pay', label: 'Mark approved withdrawals as paid', group: 'withdrawals' },
  { name: 'reconciliation.view', label: 'View reconciliation records', group: 'reconciliation' },
  { name: 'reconciliation.run', label: 'Run ledger reconciliation', group: 'reconciliation' },
  { name: 'reports.view', label: 'View financial and network reports', group: 'reports' },
  { name: 'reports.export', label: 'Export reports as CSV', group: 'reports' },
  { name: 'announcements.manage', label: 'Create and publish announcements', group: 'announcements' },
  { name: 'audit.view', label: 'View audit logs', group: 'audit' },
  { name: 'roles.manage', label: 'Assign staff roles', group: 'roles' },
  { name: 'settings.manage', label: 'Manage application settings', group: 'settings' },
  { name: 'jobs.view', label: 'Monitor scheduled job runs', group: 'jobs' },
]

export const ALL_PERMISSION_NAMES: string[] = PERMISSION_CATALOGUE.map((permission) => permission.name)

/**
 * Per-role grants. `member` intentionally has no grants; `super_admin` is
 * handled by the bypass in the permission middleware.
 */
export const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  member: [],
  finance_admin: [
    'members.view',
    'transactions.view',
    'transactions.create',
    'transactions.verify',
    'transactions.reverse',
    'commissions.view',
    'commissions.approve',
    'commissions.pay',
    'salary.view',
    'salary.approve',
    'salary.pay',
    'ledger.view',
    'deposits.view',
    'deposits.verify',
    'withdrawals.view',
    'withdrawals.approve',
    'withdrawals.pay',
    'reconciliation.view',
    'reconciliation.run',
    'reports.view',
    'reports.export',
    'jobs.view',
    'audit.view',
  ],
  compliance_officer: [
    'members.view',
    'members.verify_identity',
    'members.suspend',
    'transactions.view',
    'ledger.view',
    'audit.view',
    'reports.view',
  ],
  support_agent: [
    'members.view',
    'transactions.view',
    'reports.view',
  ],
}

export const PERMISSION_BY_NAME = new Map(PERMISSION_CATALOGUE.map((permission) => [permission.name, permission]))
