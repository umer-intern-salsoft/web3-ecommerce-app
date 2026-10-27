import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { StorefrontScreen } from './components/StorefrontScreen';
import { PaymentScreen } from './components/PaymentScreen';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import type { User } from './services/api';

function App() {
  // Lazy state initialization avoids synchronous setState in useEffect
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser) as User;
      } catch {
        localStorage.removeItem('user');
      }
    }
    return null;
  });

  const navigate = useNavigate();

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/shop');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="bg-gray-900 text-white font-sans min-h-screen">
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/shop" replace /> : <LoginScreen onLoginSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/shop" : "/login"} replace />}
        />
        <Route
          path="/shop"
          element={
            user ? (
              <StorefrontScreen user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <AdminDashboard user={user} onBackToStore={() => navigate('/shop')} />
            ) : (
              <Navigate to="/shop" replace />
            )
          }
        />
        <Route
          path="/payment"
          element={user ? <PaymentScreen /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/checkout"
          element={<Navigate to="/payment" replace />}
        />
      </Routes>
    </div>
  );
}

export default App;