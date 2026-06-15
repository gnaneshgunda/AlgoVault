import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import FeedPage from './components/FeedContainer';
import SubmitPage from './components/SubmitPage';
import ListsPage from './components/ListsPage';
import ListView from './components/ListView';
import ProfilePage from './components/ProfilePage';
import { getMe } from './api';
import './index.css';

// Toast notification system
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
};

// Protected Route wrapper
const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Restore user session on mount
  useEffect(() => {
    const token = localStorage.getItem('algovault_token');
    if (token) {
      getMe()
        .then(data => {
          setUser(data);
        })
        .catch(() => {
          localStorage.removeItem('algovault_token');
          localStorage.removeItem('algovault_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (data) => {
    // Fetch full user profile after login
    getMe().then(profile => {
      setUser(profile);
    }).catch(() => {
      // Fallback to basic info
      setUser({ id: data.user_id, username: data.username });
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('algovault_token');
    localStorage.removeItem('algovault_user');
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)'
      }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar user={user} onLogout={handleLogout} />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<FeedPage isLoggedIn={!!user} onToast={addToast} />} />
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/" replace /> : <RegisterPage onLogin={handleLogin} />
          } />

          {/* Protected routes */}
          <Route path="/submit" element={
            <ProtectedRoute user={user}>
              <SubmitPage onToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/lists" element={
            <ProtectedRoute user={user}>
              <ListsPage onToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/lists/:listId" element={
            <ProtectedRoute user={user}>
              <ListView currentUserId={user?.id} onToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute user={user}>
              <ProfilePage onToast={addToast} />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast notifications */}
        <div className="toast-container">
          {toasts.map(t => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </Router>
  );
}

export default App;
