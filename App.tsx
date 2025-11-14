import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './src/contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './src/pages/LandingPage';
import LoginPage from './src/pages/LoginPage';
import DashboardPage from './src/pages/DashboardPage';
import SettingsPage from './src/pages/SettingsPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/app/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
};

export default App;
