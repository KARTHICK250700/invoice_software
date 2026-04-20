import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/Layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import VehiclesPage from './pages/VehiclesPage';
import QuotationsPage from './pages/QuotationsPage';
import EnhancedInvoicesPage from './pages/EnhancedInvoicesPage';
import ReportsPage from './pages/EnhancedReportsPage';
import SettingsPage from './pages/SettingsPage';
import PublicInvoiceView from './components/PublicInvoiceView';
import VerifyInvoicePage from './pages/VerifyInvoicePage';
import ClientProfile from './components/ClientProfile';
import CustomerLookupPage from './pages/CustomerLookupPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/UI/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, serverWaking } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5">
        {/* Spinner */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          OM
        </div>

        <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />

        {serverWaking ? (
          /* Cold-start banner */
          <div className="flex flex-col items-center gap-1 text-center max-w-xs">
            <p className="text-sm font-semibold text-amber-700">Server is waking up…</p>
            <p className="text-xs text-gray-400">
              The backend starts sleeping after 15 minutes of inactivity.<br />
              This usually takes 30–60 seconds. Please wait.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      {/* Public route for QR code invoice access */}
      <Route path="/invoice/view/:accessCode" element={<PublicInvoiceView />} />
      {/* Public route for invoice verification */}
      <Route path="/verify-invoice/:invoiceId" element={<VerifyInvoicePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:clientId/profile" element={<ClientProfile />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="quotations" element={<QuotationsPage />} />
        <Route path="invoices" element={<EnhancedInvoicesPage />} />
        <Route path="customer-lookup" element={<CustomerLookupPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <div className="min-h-screen dark-bg">
                <AppRoutes />
              </div>
            </Router>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;