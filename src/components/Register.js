import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Register.css';

function Register() {
  const [department, setDepartment] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [userType] = useState('staff'); // กำหนดให้เป็นเจ้าหน้าที่ทั่วไปเท่านั้น
  const [selectedStaff, setSelectedStaff] = useState(null); // เจ้าหน้าที่ที่เลือก
  const [staffList, setStaffList] = useState([]); // รายชื่อเจ้าหน้าที่ในแผนก
  const [loadingStaff, setLoadingStaff] = useState(false); // โหลดข้อมูลเจ้าหน้าที่
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const departments = [
    'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
    'หอผู้ป่วยกุมารเวชกรรม',
    'หอผู้ป่วยศัลยกรรมชาย 1',
    'หอผู้ป่วยศัลยกรรมหญิง',
    'หอผู้ป่วยศัลยกรรมชาย 2',
    'หอผู้ป่วยศัลยกรรมกระดูกหญิง',
    'หอผู้ป่วยศัลยกรรมกระดูกชาย',
    'หอผู้ป่วยพิเศษ Premium',
    'หอผู้ป่วยโรคติดเชื้อ',
    'หอผู้ป่วยพิเศษ 5',
    'หอผู้ป่วยพิเศษ 4',
    'หอผู้ป่วยกึ่งวิกฤติอายุรกรรม',
    'หอผู้ป่วย ตา หู คอ จมูก',
    'ห้องผู้ป่วยหนักอายุรกรรม 2',
    'หออภิบาลผู้ป่วยวิกฤติโรคหัวใจ',
    'พิเศษ VIP',
    'หอผู้ป่วยอายุกรรมหญิง 1',
    'หอผู้ป่วยอายุกรรมหญิง 2',
    'หอผู้ป่วยนารีเวช',
    'หอผู้ป่วยหลังคลอด',
    'หอผู้ป่วยอายุกรรมชาย 1',
    'หอผู้ป่วยอายุกรรมชาย 2',
    'ห้องผู้หนักอายุรกรรม 1',
    'ไตเทียม',
    'ห้องผู้หนักศัลยกรรม 1',
    'ห้องผู้หนักศัลยกรรม 2',
    'NICU',
    'SNB',
    'ห้องคลอด',
    'OR',
    'OR minor',
    'ER'
  ];

  // ฟังก์ชันดึงข้อมูลเจ้าหน้าที่ตามแผนก
  const fetchStaffByDepartment = async (departmentName) => {
    if (!departmentName) {
      setStaffList([]);
      setSelectedStaff(null);
      return;
    }

    setLoadingStaff(true);
    setError(''); // รีเซ็ต error
    
    try {
      
      // ลองดึงข้อมูลทั้งหมดก่อนเพื่อดูโครงสร้าง
      const allStaffQuery = query(collection(db, 'staff'));
      const allStaffSnapshot = await getDocs(allStaffQuery);
      
      
      const staffData = [];
      allStaffSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // ตรวจสอบว่าข้อมูลมี department หรือไม่
        if (data.department && data.department === departmentName) {
          staffData.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setStaffList(staffData);
      setSelectedStaff(null); // รีเซ็ตการเลือกเจ้าหน้าที่
      
      if (staffData.length === 0) {
      }
      
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError(`เกิดข้อผิดพลาดในการดึงข้อมูลเจ้าหน้าที่: ${error.message}`);
    } finally {
      setLoadingStaff(false);
    }
  };

  // ฟังก์ชันเมื่อเลือกแผนก
  const handleDepartmentChange = (selectedDepartment) => {
    setDepartment(selectedDepartment);
    fetchStaffByDepartment(selectedDepartment);
  };

  // ฟังก์ชันเมื่อเลือกเจ้าหน้าที่
  const handleStaffSelection = (staff) => {
    setSelectedStaff(staff);
    setFirstName(staff.firstName);
    setLastName(staff.lastName);
    setPosition(staff.position);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!department) {
      setError('กรุณาเลือกแผนก');
      return;
    }

    if (!selectedStaff) {
      setError('กรุณาเลือกเจ้าหน้าที่จากรายชื่อ');
      return;
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      // ใช้ username@sa-hos.com เป็น email สำหรับ Firebase
      const email = `${username}@sa-hos.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // บันทึกข้อมูลผู้ใช้ลงใน Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        firstName: selectedStaff.firstName,
        lastName: selectedStaff.lastName,
        department: selectedStaff.department,
        position: selectedStaff.position,
        role: 'staff', // กำหนดให้เป็นเจ้าหน้าที่ทั่วไปเท่านั้น
        password: password, // เก็บรหัสผ่านเริ่มต้นไว้ใน Firestore
        createdAt: new Date().toISOString()
      });

      // บันทึกข้อมูลเจ้าหน้าที่ลงใน collection 'staff' ด้วย
      await setDoc(doc(db, 'staff', userCredential.user.uid), {
        id: userCredential.user.uid,
        firstName: selectedStaff.firstName,
        lastName: selectedStaff.lastName,
        department: selectedStaff.department,
        position: selectedStaff.position,
        order: 999, // ค่าเริ่มต้น
        createdAt: new Date().toISOString()
      });

      // นำทางไปยังหน้าสำหรับเจ้าหน้าที่ทั่วไปเท่านั้น
      navigate('/staff');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Username นี้มีผู้ใช้งานแล้ว กรุณาเลือก Username อื่น');
      } else {
        setError('เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
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
      <div className="register-header">
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
      <div className="register-content">
        <div className="register-card">
          <div className="card-header">
            <div className="welcome-icon">✨</div>
            <h2 className="register-title">สมัครสมาชิก</h2>
            <p className="register-subtitle">สร้างบัญชีใหม่เพื่อเข้าถึงระบบจัดการตารางเวร</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            {/* ซ่อนการเลือกประเภทผู้ใช้ - กำหนดให้เป็นเจ้าหน้าที่ทั่วไปเท่านั้น */}
            <input type="hidden" value="staff" />

            {/* เลือกแผนก */}
            <div className="form-group">
              <div className="input-wrapper">
                <select
                  className="form-input"
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  required
                >
                  <option value="">เลือกแผนก</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept}>{dept}</option>
                  ))}
                </select>
                <div className="input-focus-border"></div>
              </div>
              

            </div>

            {/* แสดงรายชื่อเจ้าหน้าที่ในแผนก */}
            {department && (
              <div className="staff-selection-section">
                <label className="staff-selection-label">เลือกเจ้าหน้าที่:</label>
                {loadingStaff ? (
                  <div className="loading-staff">กำลังโหลดรายชื่อเจ้าหน้าที่...</div>
                ) : staffList.length > 0 ? (
                  <div className="staff-list">
                    {staffList.map((staff) => (
                      <div
                        key={staff.id}
                        className={`staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`}
                        onClick={() => handleStaffSelection(staff)}
                      >
                        <div className="staff-info">
                          <div className="staff-name">{staff.firstName} {staff.lastName}</div>
                          <div className="staff-position">{staff.position}</div>
                        </div>
                        <div className="staff-select-icon">
                          {selectedStaff?.id === staff.id ? '✅' : '👤'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-staff-message">
                    ไม่พบเจ้าหน้าที่ในแผนกนี้
                  </div>
                )}
              </div>
            )}

            {/* แสดงข้อมูลเจ้าหน้าที่ที่เลือก */}
            {selectedStaff && (
              <div className="selected-staff-info">
                <div className="info-header">ข้อมูลเจ้าหน้าที่ที่เลือก:</div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">ชื่อ:</span>
                    <span className="info-value">{selectedStaff.firstName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">นามสกุล:</span>
                    <span className="info-value">{selectedStaff.lastName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">ตำแหน่ง:</span>
                    <span className="info-value">{selectedStaff.position}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">แผนก:</span>
                    <span className="info-value">{selectedStaff.department}</span>
                  </div>
                </div>
              </div>
            )}

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
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
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
              className={`register-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </span>
              <div className="btn-loading-spinner"></div>
            </button>

            <div className="login-section">
              <p className="login-text">มีบัญชีอยู่แล้ว?</p>
              <Link to="/" className="login-btn-link">
                <span>เข้าสู่ระบบ</span>
                <div className="btn-arrow">←</div>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="register-footer">
        <p>© 2024 SA HOS APP. All rights reserved.</p>
      </div>
    </div>
  );
}

export default Register;
