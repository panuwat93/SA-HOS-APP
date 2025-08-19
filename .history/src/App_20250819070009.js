import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';

import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบการล็อกอินจาก localStorage
    const checkAuthStatus = () => {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Kanit, sans-serif',
        fontSize: '1.2rem',
        color: '#2c3e50'
      }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" /> : <Register />} 
          />
          <Route 
            path="/admin/*" 
            element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/staff/*" 
            element={user && user.role === 'staff' ? <StaffDashboard /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
