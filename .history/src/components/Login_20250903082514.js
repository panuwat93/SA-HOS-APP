import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
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
      // ค้นหาผู้ใช้จาก Firestore โดยใช้ username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('ไม่พบผู้ใช้นี้ กรุณาตรวจสอบ Username');
        return;
      }

      // ตรวจสอบรหัสผ่าน
      let userFound = false;
      let userData = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.password === password) {
          userFound = true;
          userData = { ...data, uid: doc.id };
        }
      });

      if (!userFound) {
        setError('รหัสผ่านไม่ถูกต้อง');
        return;
      }

      // บันทึกข้อมูลผู้ใช้ใน localStorage
      localStorage.setItem('currentUser', JSON.stringify(userData));

      // นำทางตาม role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
