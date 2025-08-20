import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ScheduleManagement.css';

function OnCallSchedule({ user }) {
  const [staffList, setStaffList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [scheduleData, setScheduleData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCells, setSelectedCells] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [showFullTable, setShowFullTable] = useState(false);

  // State สำหรับระบบบันทึกร่าง
  const [draftData, setDraftData] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);

  // State สำหรับการจัดรูปแบบข้อความ
  const [textFormat, setTextFormat] = useState({
    color: '#000000',
    fontSize: '14'
  });

  // State สำหรับการแก้ไขเซลล์
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // โหลดรายชื่อเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
  }, []);

  // โหลดข้อมูลตารางเวรเมื่อเปลี่ยนเดือน/ปี
  useEffect(() => {
    if (staffList.length > 0) {
      loadScheduleData();
      loadHolidays();
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

  // โหลดข้อมูลตารางเวร On Call
  const loadScheduleData = async () => {
    try {
      const scheduleId = `oncall_${currentYear}_${currentMonth + 1}`;
      const scheduleDoc = await getDoc(doc(db, 'oncallSchedules', scheduleId));
      
      if (scheduleDoc.exists()) {
        setScheduleData(scheduleDoc.data().schedule || {});
      } else {
        // สร้างตารางเปล่า
        const emptySchedule = {};
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          emptySchedule[day] = {};
          staffList.forEach(staff => {
            emptySchedule[day][staff.id] = '';
          });
        }
        
        setScheduleData(emptySchedule);
      }
    } catch (error) {
      console.error('Error loading oncall schedule data:', error);
    }
  };

  // โหลดวันหยุด
  const loadHolidays = async () => {
    try {
      const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;
      const holidaysDoc = await getDoc(doc(db, 'holidays', holidaysId));
      
      if (holidaysDoc.exists()) {
        setHolidays(holidaysDoc.data().holidays || []);
      } else {
        setHolidays([]);
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
      setHolidays([]);
    }
  };

  // บันทึกข้อมูลตารางเวร On Call
  const saveScheduleData = async () => {
    try {
      const scheduleId = `oncall_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'oncallSchedules', scheduleId), {
        month: currentMonth + 1,
        year: currentYear,
        schedule: scheduleData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      
      showPopup('บันทึกตารางเวร On Call เรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving oncall schedule data:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  // แสดง popup
  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ฟังก์ชันสำหรับ dropdown วัน
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // ฟังก์ชันสำหรับ dropdown เดือน
  const getMonthNameByIndex = (index) => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[index];
  };

  if (loading) {
    return (
      <div className="schedule-management">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  return (
    <div className="schedule-management">
      <h2>📞 จัดตารางเวร On Call</h2>
      <p>ระบบจัดการตารางเวร On Call สำหรับเจ้าหน้าที่</p>

      {/* แถบควบคุม */}
      <div className="controls-container">
        {/* กล่องซ้าย: แถบควบคุมเดิม */}
        <div className="schedule-controls">
          <h3>🎛️ แถบควบคุม</h3>
          
          {/* การนำทางเดือนและปี */}
          <div className="month-navigation">
            <div className="month-year-selector">
              <div className="selector-group">
                <label htmlFor="month-selector" className="selector-label">เดือน:</label>
                <select
                  id="month-selector"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="month-selector"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {getMonthNameByIndex(i)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="selector-group">
                <label htmlFor="year-selector" className="selector-label">ปี:</label>
                <select
                  id="year-selector"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="year-selector"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={new Date().getFullYear() - 2 + i}>
                      {new Date().getFullYear() - 2 + i}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ปุ่มควบคุม */}
          <div className="control-buttons">
            <button onClick={saveScheduleData} className="btn btn-primary">
              💾 บันทึก
            </button>
            <button onClick={() => setShowFullTable(!showFullTable)} className="btn btn-info">
              {showFullTable ? '📱 แสดงแบบย่อ' : '🖥️ แสดงแบบเต็ม'}
            </button>
          </div>

          {/* สถิติ */}
          <div className="schedule-stats">
            <h4>📊 สถิติ</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">เจ้าหน้าที่ทั้งหมด:</span>
                <span className="stat-value">{staffList.length} คน</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">วันในเดือน:</span>
                <span className="stat-value">{daysInMonth} วัน</span>
              </div>
            </div>
          </div>
        </div>

        {/* กล่องขวา: วันหยุดราชการ */}
        <div className="holiday-controls">
          <h3>🏖️ วันหยุดราชการ</h3>
          
          <div className="holiday-actions">
            <button onClick={() => setShowAddHoliday(true)} className="btn btn-success">
              ➕ เพิ่มวันหยุด
            </button>
          </div>

          <div className="holiday-stats">
            <div className="stat-item">
              <span className="stat-label">วันหยุดในเดือน:</span>
              <span className="stat-value">{holidays.length} วัน</span>
            </div>
          </div>

          <div className="holiday-list">
            {holidays.length > 0 ? (
              holidays.map((holiday, index) => (
                <div key={index} className="holiday-item">
                  <span className="holiday-date">{holiday.date}</span>
                  <span className="holiday-name">{holiday.name}</span>
                </div>
              ))
            ) : (
              <p className="no-holidays">ไม่มีวันหยุดในเดือนนี้</p>
            )}
          </div>
        </div>
      </div>

      {/* ตารางเวร On Call */}
      <div className="schedule-table-container">
        <div className="schedule-table-wrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="staff-header">ลำดับ</th>
                <th className="staff-header">ชื่อ-นามสกุล</th>
                <th className="staff-header">ตำแหน่ง</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="day-header">
                    {i + 1}
                  </th>
                ))}
                <th className="summary-header">On Call รวม</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff, index) => (
                <tr key={staff.id} className="staff-row">
                  <td className="staff-cell order">{index + 1}</td>
                  <td className="staff-cell name">
                    {staff.firstName} {staff.lastName}
                  </td>
                  <td className="staff-cell position">{staff.position}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const cellValue = scheduleData[day]?.[staff.id] || '';
                    const isHoliday = holidays.some(h => h.date === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                    
                    return (
                      <td 
                        key={day} 
                        className={`schedule-cell ${isHoliday ? 'holiday' : ''}`}
                        onClick={() => setSelectedCell({ day, staffId: staff.id })}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                  <td className="summary-cell">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      return scheduleData[day]?.[staff.id] || '';
                    }).filter(value => value !== '').length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
