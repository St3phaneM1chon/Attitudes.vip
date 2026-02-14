import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import './styles/tailwind.css';

// Lazy load components
const Login = React.lazy(() => import('./components/auth/Login'));
const Register = React.lazy(() => import('./components/auth/Register'));
const OAuthCallback = React.lazy(() => import('./components/auth/OAuthCallback'));
const CustomerDashboard = React.lazy(() => import('./components/dashboard/customer/CustomerDashboard'));
const AdminDashboard = React.lazy(() => import('./components/dashboard/admin/AdminDashboard'));
const VendorDashboard = React.lazy(() => import('./components/dashboard/vendor/VendorDashboard'));
const InviteDashboard = React.lazy(() => import('./components/dashboard/invite/InviteDashboard'));
const ClientDashboard = React.lazy(() => import('./components/dashboard/client/ClientDashboard'));
const CIODashboard = React.lazy(() => import('./components/dashboard/cio/CIODashboard'));

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role}`} />;
  }

  return children;
};

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Chargement...</p>
    </div>
  </div>
);

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/:provider/callback" element={<OAuthCallback />} />

              {/* Protected Routes - Customer Dashboard */}
              <Route
                path="/dashboard/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes - Admin Dashboard */}
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes - CIO Dashboard */}
              <Route
                path="/dashboard/cio"
                element={
                  <ProtectedRoute allowedRoles={['cio']}>
                    <CIODashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes - Client Dashboard */}
              <Route
                path="/dashboard/client"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes - Vendor Dashboards */}
              <Route
                path="/dashboard/dj"
                element={
                  <ProtectedRoute allowedRoles={['dj']}>
                    <VendorDashboard vendorType="dj" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/wedding-planner"
                element={
                  <ProtectedRoute allowedRoles={['wedding-planner']}>
                    <VendorDashboard vendorType="wedding-planner" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/photographe"
                element={
                  <ProtectedRoute allowedRoles={['photographe']}>
                    <VendorDashboard vendorType="photographe" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/traiteur"
                element={
                  <ProtectedRoute allowedRoles={['traiteur']}>
                    <VendorDashboard vendorType="traiteur" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/patissier"
                element={
                  <ProtectedRoute allowedRoles={['patissier']}>
                    <VendorDashboard vendorType="patissier" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/location"
                element={
                  <ProtectedRoute allowedRoles={['location']}>
                    <VendorDashboard vendorType="location" />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes - Invite Dashboard */}
              <Route
                path="/dashboard/invite"
                element={
                  <ProtectedRoute allowedRoles={['invite']}>
                    <InviteDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Generic Dashboard Route - Redirects based on role */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Navigate to={`/dashboard/${user?.role || 'customer'}`} replace />
                  </ProtectedRoute>
                }
              />

              {/* 404 - Not Found */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold text-gray-300">404</h1>
                      <p className="text-xl text-gray-600 mt-4">Page non trouvée</p>
                      <a href="/login" className="mt-6 inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                        Retour à l'accueil
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;