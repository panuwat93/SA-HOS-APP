import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          // ดึงข้อมูลผู้ใช้จาก Firestore
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
              // ดึงข้อมูลสิทธิ์จาก staff collection (ถ้ามี)
              const staffDoc = await getDoc(doc(db, 'staff', authUser.uid));
              let staffData = {};
              if (staffDoc.exists()) {
                staffData = staffDoc.data();
              }
              // แอดมินมีสิทธิ์เต็ม
              setUser({ 
                ...authUser, 
                ...userData, 
                ...staffData,
                canEditSchedule: true, 
                canAssignTasks: true 
              });
            } else {
              // ถ้าไม่ใช่แอดมิน ให้ไปหน้า staff
              navigate('/staff');
              return;
            }
          } else {
            // ถ้าไม่มีข้อมูล ให้ออกจากระบบ
            await signOut(auth);
            navigate('/');
            return;
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          await signOut(auth);
          navigate('/');
          return;
        }
      } else {
        // ถ้าไม่มีผู้ใช้ ให้ไปหน้า login
        navigate('/');
        return;
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
