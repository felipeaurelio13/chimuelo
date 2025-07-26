import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider, ThemeScript } from './contexts/ThemeContext';
import LoadingScreen from './components/LoadingScreen';
import ModernNav from './components/ModernNav';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/ModernDashboard';
import Capture from './pages/ModernCapture';
import Timeline from './pages/ModernTimeline';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import './App.css';
import './styles/themes.css';
import './styles/design-system.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppContent() {
  const basename = import.meta.env.MODE === 'production' ? '/chimuelo' : '/';
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.MODE === 'production') {
      const swPath = import.meta.env.MODE === 'production' ? '/chimuelo/sw.js' : '/sw.js';
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(swPath)
          .then(registration => console.log('ServiceWorker registration successful'))
          .catch(err => console.log('ServiceWorker registration failed: ', err));
      });
    }
  }, []);

  return (
    <Router basename={basename}>
      <div className="ds-page">
        {/* Modern Navigation - Only show when authenticated */}
        {isAuthenticated && <ModernNav />}
        
        <div className="app-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/capture" element={
              <ProtectedRoute>
                <Capture />
              </ProtectedRoute>
            } />
            <Route path="/timeline" element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <>
      {/* Script para prevenir FOUC (Flash of Unstyled Content) */}
      <ThemeScript />
      
      {/* Providers jerárquicos */}
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
