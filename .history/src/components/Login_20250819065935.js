import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ค้นหาผู้ใช้จาก Firestore ด้วย Username
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('ไม่พบผู้ใช้นี้ กรุณาตรวจสอบ Username');
        setLoading(false);
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // ตรวจสอบรหัสผ่าน
      if (userData.password !== password) {
        setError('รหัสผ่านไม่ถูกต้อง');
        setLoading(false);
        return;
      }
      
      // ล็อกอินสำเร็จ - สร้าง session หรือ redirect ไปยังหน้าที่เหมาะสม
      console.log('Login successful:', userData);
      
      // เก็บข้อมูลผู้ใช้ใน localStorage หรือ sessionStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: userDoc.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        department: userData.department,
        position: userData.position
      }));
      
      // Redirect ไปยังหน้าที่เหมาะสม
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      {/* Header Section */}
      <div className="login-header">
        <div className="header-content">
          <div className="hospital-logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
                          <h1 className="hospital-name">SA HOS APP</h1>
            <p className="hospital-subtitle">ระบบจัดตารางเวรและมอบหมายงาน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="login-content">
        <div className="login-card">
          <div className="card-header">
            <div className="welcome-icon">👋</div>
            <h2 className="login-title">ยินดีต้อนรับ</h2>
            <p className="login-subtitle">เข้าสู่ระบบเพื่อจัดการตารางเวร</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอก Username"
                  required
                />
                <div className="input-focus-border"></div>
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
                <div className="input-focus-border"></div>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <div className="error-icon">⚠️</div>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={`login-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </span>
              <div className="btn-loading-spinner"></div>
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="login-footer">
        <p>© 2024 SA HOS APP. All rights reserved.</p>
      </div>
    </div>
  );
}

export default Login;
