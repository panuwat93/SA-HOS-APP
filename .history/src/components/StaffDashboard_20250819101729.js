import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import ScheduleManagement from './ScheduleManagement';
import TaskAssignment from './TaskAssignment';
import PreExchangeSchedule from './PreExchangeSchedule';
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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // ดึงข้อมูลผู้ใช้จาก Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'staff') {
              // ดึงข้อมูลสิทธิ์จาก staff collection โดยใช้ชื่อและนามสกุล
              
              // ค้นหาเจ้าหน้าที่ใน staff collection โดยใช้ชื่อและนามสกุล
              const staffQuery = await getDocs(collection(db, 'staff'));
              let staffData = null;
              
              // console.log('🔍 StaffDashboard - Searching for staff:', userData.firstName, userData.lastName);
              // console.log('🔍 StaffDashboard - User position from users collection:', userData.position);
              
              staffQuery.forEach((doc) => {
                const data = doc.data();
                // console.log('🔍 StaffDashboard - Checking staff:', data.firstName, data.lastName, {
                //   position: data.position,
                //   canEditSchedule: data.canEditSchedule,
                //   canAssignTasks: data.canAssignTasks
                // });
                
                if (data.firstName === userData.firstName && data.lastName === userData.lastName) {
                  staffData = { id: doc.id, ...data };
                  // console.log('🔍 StaffDashboard - Found matching staff:', staffData);
                }
              });
              
              if (!staffData) {
                // console.log('🔍 StaffDashboard - No matching staff found for:', userData.firstName, userData.lastName);
                // console.log('🔍 StaffDashboard - This might be a part time staff without database record');
              }
              
              if (staffData) {
                // รวมข้อมูลจาก users และ staff collections
                const userWithPermissions = { 
                  ...user, 
                  ...userData, 
                  ...staffData,
                  // ใช้สิทธิ์จาก staff collection
                  canEditSchedule: staffData.canEditSchedule || false,
                  canAssignTasks: staffData.canAssignTasks || false
                };
                
                // console.log('🔍 StaffDashboard - Found staff data:', staffData);
                // console.log('🔍 StaffDashboard - User with permissions:', userWithPermissions);
                // console.log('🔍 StaffDashboard - canEditSchedule:', userWithPermissions.canEditSchedule);
                // console.log('🔍 StaffDashboard - canAssignTasks:', userWithPermissions.canAssignTasks);
                
                setUser(userWithPermissions);
                
                // ดูข้อมูลสิทธิ์ของเจ้าหน้าที่ทุกคน
                const allStaffSnapshot = await getDocs(collection(db, 'staff'));
                allStaffSnapshot.forEach((doc) => {
                  const staff = doc.data();
                });
              } else {
                // ถ้าไม่พบข้อมูลใน staff collection ให้ใช้ค่า default
                const userWithDefaultPermissions = { 
                  ...user, 
                  ...userData,
                  canEditSchedule: false,
                  canAssignTasks: false
                };
                
                // console.log('🔍 StaffDashboard - No staff data found, using defaults');
                // console.log('🔍 StaffDashboard - User with default permissions:', userWithDefaultPermissions);
                
                setUser(userWithDefaultPermissions);
                const allStaffSnapshot = await getDocs(collection(db, 'staff'));
                allStaffSnapshot.forEach((doc) => {
                  const staff = doc.data();
                });
              }
            } else {
              // ถ้าไม่ใช่เจ้าหน้าที่ทั่วไป ให้ไปหน้า admin
              navigate('/admin');
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
