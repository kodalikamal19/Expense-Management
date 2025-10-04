import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DebugAuth from './components/DebugAuth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import SubmitExpense from './pages/SubmitExpense';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import CompanyManagement from './pages/CompanyManagement';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <DebugAuth />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Protected routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="app/dashboard" element={<Dashboard />} />
                <Route path="app/expenses" element={<Expenses />} />
                <Route path="app/expenses/submit" element={<SubmitExpense />} />
                <Route path="app/expenses/:id" element={<SubmitExpense />} />
                <Route path="app/approvals" element={<Approvals />} />
                <Route path="app/reports" element={<Reports />} />
                <Route path="app/profile" element={<Profile />} />
                <Route path="app/settings" element={<Settings />} />
                
                {/* Admin routes */}
                <Route path="app/admin" element={<AdminDashboard />} />
                <Route path="app/admin/companies" element={<CompanyManagement />} />
                <Route path="app/admin/users" element={<UserManagement />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
