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
    // ตรวจสอบข้อมูลผู้ใช้จาก localStorage
    const checkUser = () => {
      try {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          setUser(JSON.parse(currentUser));
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('currentUser');
      }
      setLoading(false);
    };

    checkUser();
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
            element={user ? <Navigate to="/admin" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" /> : <Register />} 
          />
          <Route 
            path="/admin/*" 
            element={user ? <AdminDashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/staff/*" 
            element={user ? <StaffDashboard /> : <Navigate to="/" />} 
          />
        </Routes>
        

      </div>
    </Router>
  );
}

export default App;
