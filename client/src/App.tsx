import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PublicLayout from './pages/PublicLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import GuestLayout from './pages/auth/GuestLayout'
import Referral from './pages/Referral'
import { MarketingPlan, PublicRewards, RankPlan } from './pages/PublicPages'
import { Contact, Legal } from './pages/PublicForms'
import MemberLayout from './pages/member/MemberLayout'
import Dashboard from './pages/member/Dashboard'
import RankProgress from './pages/member/RankProgress'
import Referrals from './pages/member/Referrals'
import Team from './pages/member/Team'
import TeamShow from './pages/member/TeamShow'
import Transactions from './pages/member/Transactions'
import Commissions from './pages/member/Commissions'
import Salary from './pages/member/Salary'
import Rewards from './pages/member/Rewards'
import Wallet from './pages/member/Wallet'
import Deposits from './pages/member/Deposits'
import Withdrawals from './pages/member/Withdrawals'
import Notifications from './pages/member/Notifications'
import Verification from './pages/member/Verification'
import Profile from './pages/member/Profile'
import Security from './pages/member/Security'
import AdminLayout from './pages/admin/AdminLayout'
import Overview from './pages/admin/Overview'
import Members from './pages/admin/Members'
import MemberShow from './pages/admin/MemberShow'
import MemberEdit from './pages/admin/MemberEdit'
import Verifications from './pages/admin/Verifications'
import Roles from './pages/admin/Roles'
import AdminTransactions from './pages/admin/Transactions'
import AdminLedger from './pages/admin/Ledger'
import AdminDeposits from './pages/admin/Deposits'
import Reconciliation from './pages/admin/Reconciliation'
import Network from './pages/admin/Network'
import CompensationPlans from './pages/admin/CompensationPlans'
import AdminCommissions from './pages/admin/Commissions'
import Ranks from './pages/admin/Ranks'
import RankReports from './pages/admin/RankReports'
import AdminSalary from './pages/admin/Salary'
import RewardClaims from './pages/admin/RewardClaims'
import Announcements from './pages/admin/Announcements'
import AuditLogs from './pages/admin/AuditLogs'
import Jobs from './pages/admin/Jobs'
import Settings from './pages/admin/Settings'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminRewards from './pages/admin/AdminRewards'
import Reports from './pages/admin/Reports'

/**
 * Roles allowed into the admin console.
 *
 * Mirrors the Laravel admin route group middleware
 * `role:super_admin,finance_admin,compliance_officer,support_agent`.
 */
const STAFF_ROLES = ['super_admin', 'finance_admin', 'compliance_officer', 'support_agent']

function Protected({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const location = useLocation()
  const token = localStorage.getItem('nexora_token')
  const raw = token ? localStorage.getItem('nexora_user') : null

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly) {
    let roles: string[] = []
    try {
      roles = raw ? JSON.parse(raw).roles ?? [] : []
    } catch {
      roles = []
    }
    if (!roles.some((role) => STAFF_ROLES.includes(role))) {
      return <Navigate to="/member" replace />
    }
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketing-plan" element={<MarketingPlan />} />
        <Route path="/rank-plan" element={<RankPlan />} />
        <Route path="/rewards" element={<PublicRewards />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/income-disclosure" element={<Legal kind="income-disclosure" />} />
        <Route path="/r/:code" element={<Referral />} />
      </Route>

      <Route element={<GuestLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route
        path="/member"
        element={
          <Protected>
            <MemberLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="rank-progress" element={<RankProgress />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="team" element={<Team />} />
        <Route path="team/:id" element={<TeamShow />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="salary" element={<Salary />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="deposits" element={<Deposits />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="verification" element={<Verification />} />
        <Route path="profile" element={<Profile />} />
        <Route path="security" element={<Security />} />
      </Route>

      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Overview />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberShow />} />
        <Route path="members/:id/edit" element={<MemberEdit />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="roles" element={<Roles />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="ledger" element={<AdminLedger />} />
        <Route path="deposits" element={<AdminDeposits />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="reports" element={<Reports />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="network" element={<Network />} />
        <Route path="compensation-plans" element={<CompensationPlans />} />
        <Route path="commissions" element={<AdminCommissions />} />
        <Route path="ranks" element={<Ranks />} />
        <Route path="rank-reports" element={<RankReports />} />
        <Route path="salary" element={<AdminSalary />} />
        <Route path="reward-claims" element={<RewardClaims />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="rewards" element={<AdminRewards />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
