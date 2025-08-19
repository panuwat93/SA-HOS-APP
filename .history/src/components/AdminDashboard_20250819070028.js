import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';
import StaffManagement from './StaffManagement';
import ScheduleManagement from './ScheduleManagement';
import PreExchangeSchedule from './PreExchangeSchedule';
import './AdminDashboard.css';

import TaskAssignment from './TaskAssignment';

function AdminDashboard() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ตรวจสอบการล็อกอินจาก localStorage
    const checkAuthStatus = () => {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          if (userData.role === 'admin') {
            setUser(userData);
          } else {
            // ถ้าไม่ใช่แอดมิน ให้ไปหน้า staff
            navigate('/staff');
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('currentUser');
          navigate('/');
          return;
        }
      } else {
        // ถ้าไม่มีผู้ใช้ ให้ไปหน้า login
        navigate('/');
        return;
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [navigate]);

  const handleLogout = () => {
    // ลบข้อมูลผู้ใช้จาก localStorage
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="header">
        <h1>🏥 SA HOS APP</h1>
        <p>ระบบจัดตารางเวรและมอบหมายงาน - แอดมิน</p>
      </div>

      <div className="nav-menu">
        {/* แฮมเบอร์เกอร์เมนูสำหรับมือถือ */}
        <div className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}></span>
        </div>

        {/* เมนูหลัก */}
        <ul className={`nav-list ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <li className="nav-item">
            <Link 
              to="/admin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={location.pathname === '/admin' ? 'active' : ''}
            >
              📅 จัดตารางเวร
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/admin/tasks" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={location.pathname === '/admin/tasks' ? 'active' : ''}
            >
              📋 จัดตารางมอบหมายงาน
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/admin/staff" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={location.pathname === '/admin/staff' ? 'active' : ''}
            >
              👥 จัดการเจ้าหน้าที่
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/admin/pre-exchange" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={location.pathname === '/admin/pre-exchange' ? 'active' : ''}
            >
              📅 ตารางก่อนแลก
            </Link>
          </li>
          <li className="nav-item">
            <button 
              onClick={() => {
                setShowChangePassword(true);
                setIsMobileMenuOpen(false);
              }}
              className="nav-button"
            >
              🔐 เปลี่ยนรหัส
            </button>
          </li>
          <li className="nav-item">
            <button onClick={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }} className="nav-button logout">
              🚪 ออกจากระบบ
            </button>
          </li>
        </ul>
      </div>

      <div className="container">
        <Routes>
          <Route path="/" element={<ScheduleManagement user={user} />} />
          <Route path="/tasks" element={<TaskAssignment user={user} />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/pre-exchange" element={<PreExchangeSchedule user={user} />} />
        </Routes>
      </div>

      {showChangePassword && (
        <ChangePasswordModal 
          onClose={() => setShowChangePassword(false)} 
        />
      )}
    </div>
  );
}

export default AdminDashboard;
