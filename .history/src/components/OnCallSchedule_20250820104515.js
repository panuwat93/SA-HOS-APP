import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './OnCallSchedule.css';

function OnCallSchedule({ user }) {
  const [staffList, setStaffList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [onCallData, setOnCallData] = useState({});
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

  // ฟังก์ชันแสดง popup
  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // โหลดรายชื่อเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
  }, []);

  // โหลดข้อมูล On call เมื่อเปลี่ยนเดือน/ปี
  useEffect(() => {
    if (staffList.length > 0) {
      loadOnCallData();
    }
  }, [staffList, currentMonth, currentYear]);

  const loadStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staff = [];
      querySnapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      // เรียงลำดับตาม order
      staff.sort((a, b) => (a.order || 0) - (b.order || 0));
      setStaffList(staff);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูล On call
  const loadOnCallData = async () => {
    try {
      const onCallId = `oncall_${currentYear}_${currentMonth + 1}`;
      const onCallDoc = await getDoc(doc(db, 'onCallSchedules', onCallId));
      
      if (onCallDoc.exists()) {
        setOnCallData(onCallDoc.data().schedule || {});
      } else {
        // สร้างตารางเปล่า
        const emptyOnCallData = {};
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          emptyOnCallData[day] = {
            primary: '',      // On call หลัก
            secondary: '',    // On call รอง
            backup: ''        // On call สำรอง
          };
        }
        
        setOnCallData(emptyOnCallData);
      }
    } catch (error) {
      console.error('Error loading on-call data:', error);
    }
  };

  // บันทึกข้อมูล On call
  const saveOnCallData = async () => {
    try {
      const onCallId = `oncall_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'onCallSchedules', onCallId), {
        month: currentMonth + 1,
        year: currentYear,
        schedule: onCallData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      showPopup('บันทึกตาราง On call เรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving on-call data:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  // อัพเดทข้อมูล On call
  const updateOnCallData = (day, field, value) => {
    setOnCallData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // เปลี่ยนเดือน
  const changeMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    }
  };

  // ชื่อเดือนภาษาไทย
  const getMonthName = () => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[currentMonth];
  };

  // สร้างตารางวัน
  const generateDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="oncall-schedule">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  const days = generateDays();

  return (
    <div className="oncall-schedule">
      <h2>📞 จัดตาราง On call</h2>
      <p>ระบบจัดการตาราง On call สำหรับเจ้าหน้าที่</p>

      {/* แถบควบคุม */}
      <div className="schedule-controls">
        <div className="month-navigation">
          <button 
            className="month-nav-btn prev"
            onClick={() => changeMonth('prev')}
          >
            ◀ เดือนก่อน
          </button>
          <h3 className="current-month">
            {getMonthName()} {currentYear}
          </h3>
          <button 
            className="month-nav-btn next"
            onClick={() => changeMonth('next')}
          >
            เดือนถัดไป ▶
          </button>
        </div>

        <div className="action-buttons">
          <button onClick={loadOnCallData} className="btn btn-info">📥 โหลดข้อมูล</button>
          <button onClick={saveOnCallData} className="btn btn-primary">💾 บันทึก</button>
        </div>
      </div>

      {/* ตาราง On call */}
      <div className="oncall-table-container">
        <table className="oncall-table">
          <thead>
            <tr>
              <th className="day-header">วันที่</th>
              <th className="primary-header">On call หลัก</th>
              <th className="secondary-header">On call รอง</th>
              <th className="backup-header">On call สำรอง</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className={day % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td className="day-cell">{day}</td>
                <td className="primary-cell">
                  <select
                    value={onCallData[day]?.primary || ''}
                    onChange={(e) => updateOnCallData(day, 'primary', e.target.value)}
                    className="staff-select"
                  >
                    <option value="">เลือกเจ้าหน้าที่</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} ({staff.position})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="secondary-cell">
                  <select
                    value={onCallData[day]?.secondary || ''}
                    onChange={(e) => updateOnCallData(day, 'secondary', e.target.value)}
                    className="staff-select"
                  >
                    <option value="">เลือกเจ้าหน้าที่</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} ({staff.position})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="backup-cell">
                  <select
                    value={onCallData[day]?.backup || ''}
                    onChange={(e) => updateOnCallData(day, 'backup', e.target.value)}
                    className="staff-select"
                  >
                    <option value="">เลือกเจ้าหน้าที่</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} ({staff.position})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup แจ้งเตือน */}
      {popup.show && (
        <div className={`popup ${popup.type}`}>
          <div className="popup-content">
            <span className="popup-message">{popup.message}</span>
            <button 
              className="popup-close"
              onClick={() => setPopup({ show: false, message: '', type: 'success' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnCallSchedule;
