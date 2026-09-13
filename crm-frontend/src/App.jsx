import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ToastContainer from './components/common/ToastContainer';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const LoyaltyDashboardPage = lazy(() => import('./pages/LoyaltyDashboardPage'));
const LoyaltyMembersPage = lazy(() => import('./pages/LoyaltyMembersPage'));
const LoyaltyTiersPage = lazy(() => import('./pages/LoyaltyTiersPage'));
const LoyaltyRewardsPage = lazy(() => import('./pages/LoyaltyRewardsPage'));
const LoyaltyRulesPage = lazy(() => import('./pages/LoyaltyRulesPage'));
const LoyaltyEngagementPage = lazy(() => import('./pages/LoyaltyEngagementPage'));
const LoyaltyLedgerPage = lazy(() => import('./pages/LoyaltyLedgerPage'));
const MemberLoginPage = lazy(() => import('./pages/MemberLoginPage'));
const MemberPortalPage = lazy(() => import('./pages/MemberPortalPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CampaignPage = lazy(() => import('./pages/CampaignPage'));
const CsatPage = lazy(() => import('./pages/CsatPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RetentionRadarPage = lazy(() => import('./pages/RetentionRadarPage'));
const VoiceOfCustomerPage = lazy(() => import('./pages/VoiceOfCustomerPage'));
const SepidarIntegrationPage = lazy(() => import('./pages/SepidarIntegrationPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-900"><div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/club/login" element={<MemberLoginPage />} />
        <Route path="/club" element={<MemberPortalPage />} />
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<LoyaltyDashboardPage />} />
          <Route path="/members" element={<LoyaltyMembersPage />} />
          <Route path="/members/:id" element={<CustomerDetailPage />} />
          <Route path="/tiers" element={<LoyaltyTiersPage />} />
          <Route path="/rewards" element={<LoyaltyRewardsPage />} />
          <Route path="/loyalty-rules" element={<LoyaltyRulesPage />} />
          <Route path="/engagement" element={<LoyaltyEngagementPage />} />
          <Route path="/loyalty-ledger" element={<LoyaltyLedgerPage />} />
          <Route path="/retention" element={<RetentionRadarPage />} />
          <Route path="/voice-of-customer" element={<VoiceOfCustomerPage />} />
          <Route path="/customers" element={<Navigate to="/members" replace />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/campaigns" element={<CampaignPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/integration/sepidar" element={<ProtectedRoute roles={['ADMIN']}><SepidarIntegrationPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        </Route>
        {/* CSAT — عمومی، بدون لاگین */}
        <Route path="/csat/:token" element={<CsatPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}
