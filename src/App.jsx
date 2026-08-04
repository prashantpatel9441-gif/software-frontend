import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import { cancelPendingGetRequests } from './services/api';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const SalesOrder = lazy(() => import('./pages/SalesOrder'));
const NewBilling = lazy(() => import('./pages/NewBilling'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const Categories = lazy(() => import('./pages/Categories'));
const Collections = lazy(() => import('./pages/Collections'));
const Variants = lazy(() => import('./pages/Variants'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));
const Drafts = lazy(() => import('./pages/Drafts'));
const Login = lazy(() => import('./pages/Login'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
  </div>
);

const RouteChangeTracker = () => {
  const location = useLocation();
  useEffect(() => {
    cancelPendingGetRequests();
  }, [location.pathname]);
  return null;
};

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };
  
  return (
    <Layout onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );
};

// Route wrapper components to pass navigation hooks instead of state callbacks
const DashboardWrapper = () => {
  const navigate = useNavigate();
  return (
    <Dashboard 
      onManageOrders={() => navigate('/sales')}
      onViewCustomers={() => navigate('/customers')}
    />
  );
};

const SalesOrderWrapper = () => {
  const navigate = useNavigate();
  return (
    <SalesOrder 
      onCreateInvoice={() => navigate('/billing')}
      onViewDrafts={() => navigate('/drafts')}
    />
  );
};

const DraftsWrapper = () => {
  const navigate = useNavigate();
  const handleEditDraft = (draft) => {
    navigate('/billing', { state: { draftData: draft } });
  };
  return (
    <Drafts 
      onEditDraft={handleEditDraft}
      onBack={() => navigate('/sales')}
    />
  );
};

const CustomersWrapper = () => {
  const navigate = useNavigate();
  return (
    <Customers 
      onViewProfile={(id) => navigate(`/customers/${id}`)}
      onCreateInvoice={(customer) => navigate('/billing', { state: { prefillCustomer: customer } })}
    />
  );
};

const CustomerProfileWrapper = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <CustomerProfile 
      customerId={id}
      onBack={() => navigate('/customers')}
      onCreateInvoice={(customer) => navigate('/billing', { state: { prefillCustomer: customer } })}
    />
  );
};

const NewBillingWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const draftData = location.state?.draftData || null;
  const prefillCustomer = location.state?.prefillCustomer || null;
  
  return (
    <NewBilling 
      onBack={() => navigate('/sales')}
      draftData={draftData}
      prefillCustomer={prefillCustomer}
    />
  );
};

const LoginWrapper = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  return <Login onLoginSuccess={() => navigate('/dashboard')} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <RouteChangeTracker />
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardWrapper />} />
            <Route path="sales" element={<SalesOrderWrapper />} />
            <Route path="billing" element={<NewBillingWrapper />} />
            <Route path="drafts" element={<DraftsWrapper />} />
            <Route path="customers" element={<CustomersWrapper />} />
            <Route path="customers/:id" element={<CustomerProfileWrapper />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="categories" element={<Categories />} />
            <Route path="collections" element={<Collections />} />
            <Route path="variants" element={<Variants />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;