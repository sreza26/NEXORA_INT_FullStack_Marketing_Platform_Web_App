import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PublicLayout from './pages/PublicLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import Referral from './pages/Referral'
import { MarketingPlan, PublicRewards, RankPlan } from './pages/PublicPages'
import { Contact, Legal } from './pages/PublicForms'
import MemberLayout from './pages/member/MemberLayout'
import Dashboard from './pages/member/Dashboard'
import Network from './pages/member/Network'
import Commissions from './pages/member/Commissions'
import Wallet from './pages/member/Wallet'
import Withdrawals from './pages/member/Withdrawals'
import Rewards from './pages/member/Rewards'
import AdminLayout from './pages/admin/AdminLayout'
import Overview from './pages/admin/Overview'
import Members from './pages/admin/Members'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminRewards from './pages/admin/AdminRewards'
import Reports from './pages/admin/Reports'

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
    if (roles.length === 0 || roles.every((role) => role === 'member')) {
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

      <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />

      <Route
        path="/member"
        element={
          <Protected>
            <MemberLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="network" element={<Network />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="rewards" element={<Rewards />} />
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
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
