import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAppStore } from './store/useAppStore';
import Auth from './pages/Auth';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setCurrentUser({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar: user.photoURL || undefined
        });
      } else {
        // User is signed out
        // If we are in MVP showcase mode and simulated login happened, currentUser might be set manually
        // We will only clear it if we actually intend to log out. 
        // For strict persistence:
        // setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={currentUser ? <Navigate to="/dashboard" replace /> : <Auth />} 
        />
        <Route 
          path="/dashboard" 
          element={currentUser ? <DashboardLayout /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={currentUser ? "/dashboard" : "/auth"} replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
