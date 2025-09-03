import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';
import ScheduleManagement from './ScheduleManagement';
import TaskAssignment from './TaskAssignment';
import PreExchangeSchedule from './PreExchangeSchedule';
import OnCallSchedule from './OnCallSchedule';
import StaffCalendar from './StaffCalendar';
import ChangePasswordModal from './ChangePasswordModal';
import './StaffDashboard.css';

function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ตรวจสอบข้อมูลผู้ใช้จาก localStorage
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        if (userData.role === 'staff') {
          // ดึงข้อมูลสิทธิ์จาก staff collection โดยใช้ชื่อและนามสกุล
          const staffQuery = getDocs(collection(db, 'staff'));
          let staffData = null;
          
          staffQuery.then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.firstName === userData.firstName && data.lastName === userData.lastName) {
                staffData = { id: doc.id, ...data };
              }
            });
            
            if (staffData) {
              // รวมข้อมูลจาก users และ staff collections
              const userWithPermissions = { 
                ...userData, 
                ...staffData,
                // ใช้สิทธิ์จาก staff collection
                canEditSchedule: staffData.canEditSchedule || false,
                canAssignTasks: staffData.canAssignTasks || false
              };
              
              setUser(userWithPermissions);
            } else {
              // ถ้าไม่พบข้อมูลใน staff collection ให้ใช้ค่า default
              const userWithDefaultPermissions = { 
                ...userData,
                canEditSchedule: false,
                canAssignTasks: false
              };
              
              setUser(userWithDefaultPermissions);
            }
            setLoading(false);
          }).catch((error) => {
            console.error('Error fetching staff data:', error);
            // ถ้าเกิดข้อผิดพลาด ให้ใช้ค่า default
            const userWithDefaultPermissions = { 
              ...userData,
              canEditSchedule: false,
              canAssignTasks: false
            };
            
            setUser(userWithDefaultPermissions);
            setLoading(false);
          });
        } else {
          // ถ้าไม่ใช่เจ้าหน้าที่ทั่วไป ให้ไปหน้า admin
          navigate('/admin');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('currentUser');
        navigate('/');
        return;
      }
    } else {
      // ถ้าไม่มีข้อมูล ให้ไปหน้า login
      navigate('/');
      return;
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // ลบข้อมูลผู้ใช้จาก localStorage
      localStorage.removeItem('currentUser');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="staff-dashboard">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <div className="staff-header">
        <div className="header-content">
          <div className="hospital-logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <h1 className="hospital-name">SA HOS APP</h1>
              <p className="hospital-subtitle">ระบบจัดตารางเวรและมอบหมายงาน - เจ้าหน้าที่</p>
            </div>
          </div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-text">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-position">{user?.position}</span>
                <span className="user-department">{user?.department}</span>
                {/* แสดงสิทธิ์ของตัวเอง */}
                <div className="user-permissions">
                  <span className="permission-label">สิทธิ์:</span>
                  
                                    {/* Debug: แสดงข้อมูลสิทธิ์ */}
                  {user?.canEditSchedule && (
                    <span className="permission-badge schedule" title="แก้ไขตารางเวร">📅 แก้ไขตารางเวร</span>
                  )}
                  {user?.canAssignTasks && (
                    <span className="permission-badge tasks" title="มอบหมายงาน">📋 มอบหมายงาน</span>
                  )}
                  {!user?.canEditSchedule && !user?.canAssignTasks && (
                    <span className="permission-badge readonly" title="ดูอย่างเดียว">👁️ ดูอย่างเดียว</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="nav-menu">
        {/* แฮมเบอร์เกอร์เมนูสำหรับมือถือ */}
        <div className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}></span>
        </div>

        {/* เมนูหลัก */}
        <ul className={`nav-list ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <li className="nav-item">
            <button 
              onClick={() => {
                navigate('/staff');
                setIsMobileMenuOpen(false);
              }}
              className={`nav-button ${location.pathname === '/staff' ? 'active' : ''}`}
            >
              📅 ดูตารางเวร
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => {
                navigate('/staff/tasks');
                setIsMobileMenuOpen(false);
              }}
              className={`nav-button ${location.pathname === '/staff/tasks' ? 'active' : ''}`}
            >
              📋 ดูงานที่มอบหมาย
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => {
                navigate('/staff/pre-exchange-schedule');
                setIsMobileMenuOpen(false);
              }}
              className={`nav-button ${location.pathname === '/staff/pre-exchange-schedule' ? 'active' : ''}`}
            >
              📊 ตารางก่อนแลก
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => {
                navigate('/staff/oncall');
                setIsMobileMenuOpen(false);
              }}
              className={`nav-button ${location.pathname === '/staff/oncall' ? 'active' : ''}`}
            >
              📞 ตาราง On Call
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => {
                navigate('/staff/calendar');
                setIsMobileMenuOpen(false);
              }}
              className={`nav-button ${location.pathname === '/staff/calendar' ? 'active' : ''}`}
            >
              📅 ปฏิทิน
            </button>
          </li>
          <li className="nav-item">
            <button 
              onClick={() => {
                setShowChangePassword(true);
                setIsMobileMenuOpen(false);
              }}
              className="nav-button"
            >
              🔐 เปลี่ยนรหัสผ่าน
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

      {/* Main Content */}
      <div className="container">
        <Routes>
          <Route path="/" element={<ScheduleManagement user={user} />} />
          <Route path="/tasks" element={<TaskAssignment user={user} />} />
          <Route path="/pre-exchange-schedule" element={<PreExchangeSchedule user={user} />} />
          <Route path="/oncall" element={<OnCallSchedule user={user} />} />
          <Route path="/calendar" element={<StaffCalendar user={user} />} />
        </Routes>
      </div>

      {/* Footer */}
      <div className="staff-footer">
        <p>© 2024 SA HOS APP. All rights reserved.</p>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal 
          onClose={() => setShowChangePassword(false)} 
        />
      )}
    </div>
  );
}

export default StaffDashboard;