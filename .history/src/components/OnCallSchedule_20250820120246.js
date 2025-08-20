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

  // ฟังก์ชันตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
  const canEdit = () => {
    return user?.role === 'admin';
  };

  // ฟังก์ชันตรวจสอบสิทธิ์การดู - เจ้าหน้าทั่วไปดูได้ แอดมินแก้ไขได้
  const canView = () => {
    return user?.role === 'admin' || user?.role === 'staff';
  };

  // โหลดรายชื่อเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
  }, []);

  // โหลดข้อมูลตารางเวรเมื่อเปลี่ยนเดือน
  useEffect(() => {
    if (staffList.length > 0) {
      loadSchedule();
    }
  }, [staffList, currentMonth, currentYear]);

  // โหลดวันหยุดเมื่อเปลี่ยนเดือน
  useEffect(() => {
    loadHolidaysFromDB();
  }, [currentMonth, currentYear]);

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
  const loadSchedule = async () => {
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

  // จัดการการป้อนข้อมูลในเซลล์
  const handleCellInput = (day, staffId, value) => {
    // ตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
    if (!canEdit()) {
      return; // ไม่มีสิทธิ์แก้ไข
    }
    
    setScheduleData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [staffId]: value
      }
    }));
  };

  // จัดการการกดปุ่มลูกศร
  const handleKeyDown = (e, day, staffId) => {
    const currentDay = parseInt(day);
    const currentStaffIndex = staffList.findIndex(staff => staff.id === staffId.replace('_extra', ''));
    const isExtraRow = staffId.includes('_extra');
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (isExtraRow) {
          // ถ้าอยู่แถวที่ 2 ให้ไปแถวที่ 1 ของเจ้าหน้าที่คนเดียวกัน
          const targetInput = document.querySelector(`[data-day="${currentDay}"][data-staff="${staffId.replace('_extra', '')}"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        } else if (currentStaffIndex > 0) {
          // ถ้าอยู่แถวที่ 1 ให้ไปแถวที่ 2 ของเจ้าหน้าที่คนก่อนหน้า
          const prevStaff = staffList[currentStaffIndex - 1];
          const targetInput = document.querySelector(`[data-day="${currentDay}"][data-staff="${prevStaff.id}_extra"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (!isExtraRow) {
          // ถ้าอยู่แถวที่ 1 ให้ไปแถวที่ 2 ของเจ้าหน้าที่คนเดียวกัน
          const targetInput = document.querySelector(`[data-day="${currentDay}"][data-staff="${staffId}_extra"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        } else if (currentStaffIndex < staffList.length - 1) {
          // ถ้าอยู่แถวที่ 2 ให้ไปแถวที่ 1 ของเจ้าหน้าที่คนถัดไป
          const nextStaff = staffList[currentStaffIndex + 1];
          const targetInput = document.querySelector(`[data-day="${currentDay}"][data-staff="${nextStaff.id}"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (currentDay > 1) {
          const targetInput = document.querySelector(`[data-day="${currentDay - 1}"][data-staff="${staffId}"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        if (currentDay < daysInMonth) {
          const targetInput = document.querySelector(`[data-day="${currentDay + 1}"][data-staff="${staffId}"] input`);
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        }
        break;
        
      case 'Tab':
        // ใช้ Tab ปกติ
        break;
        
      default:
        return; // ไม่ต้องป้องกันการทำงานปกติของปุ่มอื่นๆ
    }
  };

  // บันทึกตารางเวร
  const saveSchedule = async () => {
    // ตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
    if (!canEdit()) {
      showPopup('❌ ไม่มีสิทธิ์บันทึกตาราง On Call - เฉพาะแอดมินเท่านั้น', 'error');
      return;
    }

    console.log('🔄 เริ่มบันทึกตาราง On Call...');
    console.log('📅 เดือน:', currentMonth + 1, 'ปี:', currentYear);
    console.log('📊 ข้อมูลตาราง:', scheduleData);

    try {
      const scheduleId = `oncall_${currentYear}_${currentMonth + 1}`;
      console.log('🆔 ID เอกสาร:', scheduleId);
      
      await setDoc(doc(db, 'oncallSchedules', scheduleId), {
        month: currentMonth + 1,
        year: currentYear,
        schedule: scheduleData,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ บันทึกสำเร็จ!');
      showPopup('บันทึกตารางเวร On Call เรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  // สลับการแสดงตารางเต็ม
  const toggleFullTable = () => {
    setShowFullTable(!showFullTable);
    
    // ปรับ CSS ของตาราง
    const containers = document.querySelectorAll('.schedule-table-container');
    containers.forEach(container => {
      if (!showFullTable) {
        // แสดงตารางเต็ม
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
        container.style.overflowX = 'auto';
      } else {
        // คืนค่าเดิม (แสดง 6 คน)
        container.style.maxHeight = '600px';
        container.style.overflowY = 'auto';
        container.style.overflowX = 'auto';
      }
    });
    
    // แสดง popup แจ้งเตือน
    if (!showFullTable) {
      showPopup('แสดงตารางเต็มแล้ว - เหมาะสำหรับการส่งออกภาพ', 'info');
    } else {
      showPopup('กลับไปแสดงตารางแบบปกติ (6 คน)', 'info');
    }
  };

  // โหลดวันหยุด
  const loadHolidaysFromDB = async () => {
    setHolidayLoading(true);
    try {
      const month = currentMonth + 1;
      const year = currentYear;
      const holidaysId = `holidays_${year}_${month}`;
      const holidaysDoc = await getDoc(doc(db, 'holidays', holidaysId));

      if (holidaysDoc.exists()) {
        setHolidays(holidaysDoc.data().holidays || []);
      } else {
        // ไม่มีวันหยุดในฐานข้อมูล ให้เริ่มต้นด้วยอาร์เรย์ว่าง
        setHolidays([]);
      }
    } catch (error) {
      console.error('Error loading holidays from DB:', error);
      // ถ้าเกิดข้อผิดพลาดในการโหลดจาก DB ให้เริ่มต้นด้วยอาร์เรย์ว่าง
      setHolidays([]);
    } finally {
      setHolidayLoading(false);
    }
  };

  // บันทึกวันหยุด
  const saveHolidays = async () => {
    // ตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
    if (!canEdit()) {
      showPopup('❌ ไม่มีสิทธิ์บันทึกวันหยุด - เฉพาะแอดมินเท่านั้น', 'error');
      return;
    }

    try {
      const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'holidays', holidaysId), {
        month: currentMonth + 1,
        year: currentYear,
        holidays,
        updatedAt: new Date().toISOString()
      });
      showPopup('บันทึกวันหยุดเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving holidays:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึกวันหยุด', 'error');
    }
  };

  // ลบวันหยุด
  const removeHoliday = async (holidayId) => {
    // ตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
    if (!canEdit()) {
      showPopup('❌ ไม่มีสิทธิ์ลบวันหยุด - เฉพาะแอดมินเท่านั้น', 'error');
      return;
    }
    
    try {
      // ลบออกจาก state
      const updatedHolidays = holidays.filter(h => h.id !== holidayId);
      setHolidays(updatedHolidays);
      
      // บันทึกลงฐานข้อมูลทันที
      const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'holidays', holidaysId), {
        month: currentMonth + 1,
        year: currentYear,
        holidays: updatedHolidays,
        updatedAt: new Date().toISOString()
      });
      
      showPopup('ลบวันหยุดเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error removing holiday:', error);
      showPopup('เกิดข้อผิดพลาดในการลบวันหยุด', 'error');
    }
  };

  // เพิ่มวันหยุด
  const addHoliday = async () => {
    // ตรวจสอบสิทธิ์การแก้ไข - เฉพาะแอดมินเท่านั้น
    if (!canEdit()) {
      showPopup('❌ ไม่มีสิทธิ์เพิ่มวันหยุด - เฉพาะแอดมินเท่านั้น', 'error');
      return;
    }

    if (newHoliday.date && newHoliday.name) {
      const existingHoliday = holidays.find(h => new Date(h.date).getDate() === new Date(newHoliday.date).getDate() && new Date(h.date).getMonth() === new Date(newHoliday.date).getMonth());
      if (existingHoliday) {
        showPopup('วันหยุดนี้มีอยู่แล้ว! กรุณาเลือกวันที่อื่น', 'warning');
        return;
      }

      try {
        const holiday = {
          id: `custom_${Date.now()}`,
          date: newHoliday.date,
          name: newHoliday.name,
          type: 'เพิ่มเติม'
        };
        
        const updatedHolidays = [...holidays, holiday];
        setHolidays(updatedHolidays);
        setNewHoliday({ date: '', name: '' });
        
        // บันทึกลงฐานข้อมูลทันที
        const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;
        await setDoc(doc(db, 'holidays', holidaysId), {
          month: currentMonth + 1,
          year: currentYear,
          holidays: updatedHolidays,
          updatedAt: new Date().toISOString()
        });
        
        showPopup('เพิ่มวันหยุดเรียบร้อยแล้ว', 'success');
      } catch (error) {
        console.error('Error adding holiday:', error);
        showPopup('เกิดข้อผิดพลาดในการเพิ่มวันหยุด', 'error');
      }
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

  // ฟังก์ชันคำนวณจำนวนวันทำการในเดือน (เหมือนหน้าจัดตารางเวร)
  const getWorkingDays = () => {
    let workingDays = 0;
    
    // วนลูปทุกวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // อาทิตย์ = 0, เสาร์ = 6
      const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
      
      // ถ้าไม่ใช่วันหยุดและไม่ใช่วันเสาร์อาทิตย์ = วันทำการ
      if (!isWeekend && !isHoliday) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  // ฟังก์ชันสำหรับดึงข้อมูลวันหยุดตามปีและเดือน (ตัวอย่าง)
  const getSampleThaiHolidays = (year, month) => {
    // ฟังก์ชันนี้จะไม่ถูกใช้แล้ว เพราะเราเริ่มต้นด้วยอาร์เรย์ว่าง
    // และให้ผู้ใช้เพิ่มวันหยุดเอง
    return [];
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
    <div className="oncall-schedule">
      {/* แสดงข้อความแจ้งเตือนสำหรับเจ้าหน้าทั่วไป */}
      {!canEdit() && (
        <div className="permission-warning" style={{
          background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
          border: '2px solid #FF9800',
          borderRadius: '12px',
          padding: '15px 20px',
          margin: '20px 0',
          textAlign: 'center',
          color: '#E65100',
          fontWeight: '600',
          fontSize: '16px'
        }}>
          ⚠️ เจ้าหน้าทั่วไป - ดูได้อย่างเดียว แก้ไขไม่ได้ (เฉพาะแอดมินเท่านั้นที่แก้ไขได้)
        </div>
      )}

      {/* แถบควบคุม 2 กล่องซ้ายขวา */}
      <div className="controls-container">
        {/* กล่องซ้าย: แถบควบคุมเดิม */}
        <div className="schedule-controls">
          <div className="month-navigation">
            <div className="month-selector">
              <label htmlFor="month-select" className="selector-label">เดือน:</label>
              <select 
                id="month-select"
                value={currentMonth} 
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="month-dropdown"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {getMonthNameByIndex(i)}
                  </option>
                ))}
              </select>
            </div>
            <div className="year-selector">
              <label htmlFor="year-select" className="selector-label">ปี:</label>
              <select 
                id="year-select"
                value={currentYear} 
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="year-dropdown"
              >
                {Array.from({ length: 21 }, (_, i) => {
                  const year = currentYear - 10 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="action-buttons">
            {canEdit() && (
              <button 
                onClick={saveSchedule} 
                className="btn btn-primary"
              >
                💾 บันทึก
              </button>
            )}
            
            <button 
              onClick={toggleFullTable}
              className={`btn ${showFullTable ? 'btn-success' : 'btn-secondary'}`}
              title={showFullTable ? 'กลับไปแสดงตารางแบบปกติ (6 คน)' : 'แสดงตารางเต็มทุกคน'}
            >
              {showFullTable ? '📋 แสดงปกติ' : '📋 แสดงเต็ม'}
            </button>
          </div>
        </div>

        {/* กล่องขวา: วันหยุดราชการ */}
        <div className="holiday-controls">
          <h3>🏛️ วันหยุดราชการ</h3>
          
          {/* ปุ่มดึงข้อมูลออนไลน์ - แสดงเฉพาะแอดมิน */}
          {canEdit() && (
            <div className="holiday-actions">
              <button
                onClick={loadHolidaysFromDB}
                className="fetch-holidays-btn"
                disabled={holidayLoading}
              >
                {holidayLoading ? '🔄 กำลังดึงข้อมูล...' : '🌐 ดึงข้อมูลออนไลน์'}
              </button>
              <button
                onClick={saveHolidays}
                className="save-holidays-btn"
                disabled={holidays.length === 0}
              >
                💾 บันทึกวันหยุด
              </button>
              {holidays.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm('คุณแน่ใจหรือไม่ที่จะล้างวันหยุดทั้งหมดในเดือนนี้?')) {
                      try {
                        setHolidays([]);
                        const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;
                        await setDoc(doc(db, 'holidays', holidaysId), {
                          month: currentMonth + 1,
                          year: currentYear,
                          holidays: [],
                          updatedAt: new Date().toISOString()
                        });
                        showPopup('ล้างวันหยุดทั้งหมดเรียบร้อยแล้ว', 'success');
                      } catch (error) {
                        console.error('Error clearing holidays:', error);
                        showPopup('เกิดข้อผิดพลาดในการล้างวันหยุด', 'error');
                      }
                    }
                  }}
                  className="clear-holidays-btn"
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ ล้างทั้งหมด
                </button>
              )}
            </div>
          )}
          
          {holidayLoading ? (
            <div className="holiday-loading">กำลังโหลดวันหยุด...</div>
          ) : (
            <>
              <div className="holiday-list">
                {(() => {
                  // กรองวันหยุดเฉพาะเดือนที่เลือก
                  const currentMonthHolidays = holidays.filter(holiday => {
                    const holidayDate = new Date(holiday.date);
                    const holidayMonth = holidayDate.getMonth();
                    const holidayYear = holidayDate.getFullYear();
                    return holidayMonth === currentMonth && holidayYear === currentYear;
                  });
                  
                  return currentMonthHolidays.length > 0 ? (
                    currentMonthHolidays.map(holiday => (
                      <div key={holiday.id} className="holiday-item">
                        <div className="holiday-date">
                          {new Date(holiday.date).getDate()}/{new Date(holiday.date).getMonth() + 1}
                        </div>
                        <div className="holiday-name">{holiday.name}</div>
                        <div className="holiday-type">{holiday.type}</div>
                        {canEdit() && (
                          <button
                            onClick={() => removeHoliday(holiday.id)}
                            className="remove-holiday-btn"
                            title="ลบวันหยุด"
                            style={{
                              backgroundColor: '#ff4757',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="no-holidays" style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      📅 ไม่มีวันหยุดในเดือนนี้
                      {canEdit() && (
                        <div style={{ marginTop: '10px', fontSize: '14px' }}>
                          คลิก "เพิ่ม" ด้านล่างเพื่อเพิ่มวันหยุดใหม่
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ฟอร์มเพิ่มวันหยุด - แสดงเฉพาะแอดมิน */}
              {canEdit() && (
                <div className="add-holiday-form" style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>➕ เพิ่มวันหยุดใหม่</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      className="holiday-date-input"
                      placeholder="เลือกวันที่"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="text"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                      className="holiday-name-input"
                      placeholder="ชื่อวันหยุด"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px',
                        minWidth: '200px'
                      }}
                    />
                    <button
                      onClick={addHoliday}
                      className="btn btn-primary add-holiday-btn"
                      disabled={!newHoliday.date || !newHoliday.name}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        opacity: (!newHoliday.date || !newHoliday.name) ? '0.6' : '1'
                      }}
                    >
                      ➕ เพิ่ม
                    </button>
                  </div>
                  {newHoliday.date && newHoliday.name && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '12px', 
                      color: '#6c757d',
                      fontStyle: 'italic' 
                    }}>
                      📅 จะเพิ่มวันหยุด: {new Date(newHoliday.date).getDate()}/{new Date(newHoliday.date).getMonth() + 1} - {newHoliday.name}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ตารางเวร On Call */}
      <div className="schedule-tables">
        {/* ตารางพยาบาล */}
        {(() => {
          const nurseStaff = staffList.filter(staff => staff.position === 'พยาบาล');
          if (nurseStaff.length === 0) return null;
          
          return (
            <div key="พยาบาล" className="schedule-table-section">
              <h3 className="table-title">
                👩‍⚕️ พยาบาล ({nurseStaff.length} คน) - วันทำการ: {getWorkingDays()} วัน
              </h3>
              <div className="schedule-table-container">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th className="order-col">No.</th>
                      <th className="name-col">ชื่อ-นามสกุล</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const date = new Date(currentYear, currentMonth, day);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                        
                        return (
                          <th 
                            key={day} 
                            className={`day-col ${isWeekend ? 'weekend-col' : ''} ${isHoliday ? 'holiday-col' : ''}`}
                          >
                            <div className="day-header">
                              <div className="day-number">{day}</div>
                              <div className={`day-name ${isWeekend ? 'weekend' : ''} ${isHoliday ? 'holiday' : ''}`}>
                                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dayOfWeek]}
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="total-col">On Call รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nurseStaff.map((staff, index) => (
                      <React.Fragment key={staff.id}>
                        {/* แถวที่ 1: ชื่อเจ้าหน้าที่ */}
                        <tr className="staff-name-row">
                          <td className="order-cell" rowSpan="2">{index + 1}</td>
                          <td className="name-cell" rowSpan="2">
                            <div className="staff-name-container">
                              <div className="staff-first-name">{staff.firstName}</div>
                              <div className="staff-last-name">{staff.lastName}</div>
                              <div className="staff-position" data-position={staff.position}>{staff.position}</div>
                            </div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(currentYear, currentMonth, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                            const cellValue = scheduleData[day]?.[staff.id] || '';
                            
                            return (
                              <td 
                                key={day} 
                                className={`schedule-cell ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''}`}
                                onClick={() => setSelectedCell({ day, staffId: staff.id })}
                                data-day={day}
                                data-staff={staff.id}
                              >
                                <input
                                  type="text"
                                  value={cellValue}
                                  onChange={(e) => handleCellInput(day, staff.id, e.target.value)}
                                  onKeyDown={(e) => canEdit() ? handleKeyDown(e, day, staff.id) : null}
                                  className="cell-input"
                                  placeholder=""
                                  disabled={!canEdit()}
                                />
                              </td>
                            );
                          })}
                          <td className="total-cell" rowSpan="2">
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const day = i + 1;
                              return scheduleData[day]?.[staff.id] || '';
                            }).filter(value => value !== '').length}
                          </td>
                        </tr>
                        {/* แถวที่ 2: พิมพ์อะไรก็ได้ */}
                        <tr className="staff-extra-row">
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(currentYear, currentMonth, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                            const extraValue = scheduleData[day]?.[`${staff.id}_extra`] || '';
                            
                            return (
                              <td 
                                key={day} 
                                className={`schedule-cell extra ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''}`}
                                onClick={() => setSelectedCell({ day, staffId: `${staff.id}_extra` })}
                                data-day={day}
                                data-staff={`${staff.id}_extra`}
                              >
                                <input
                                  type="text"
                                  value={extraValue}
                                  onChange={(e) => handleCellInput(day, `${staff.id}_extra`, e.target.value)}
                                  onKeyDown={(e) => canEdit() ? handleKeyDown(e, day, `${staff.id}_extra`) : null}
                                  className="cell-input extra"
                                  placeholder=""
                                  disabled={!canEdit()}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ตารางผู้ช่วย */}
        {(() => {
          const assistantStaff = staffList.filter(staff => 
            ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position)
          );
          if (assistantStaff.length === 0) return null;
          
          return (
            <div key="ผู้ช่วย" className="schedule-table-section">
              <h3 className="table-title">
                👥 กลุ่มผู้ช่วย ({assistantStaff.length} คน) - วันทำการ: {getWorkingDays()} วัน
              </h3>
              <div className="schedule-table-container">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th className="order-col">No.</th>
                      <th className="name-col">ชื่อ-นามสกุล</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const date = new Date(currentYear, currentMonth, day);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                        
                        return (
                          <th 
                            key={day} 
                            className={`day-col ${isWeekend ? 'weekend-col' : ''} ${isHoliday ? 'holiday-col' : ''}`}
                          >
                            <div className="day-header">
                              <div className="day-number">{day}</div>
                              <div className={`day-name ${isWeekend ? 'weekend' : ''} ${isHoliday ? 'holiday' : ''}`}>
                                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dayOfWeek]}
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="total-col">On Call รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistantStaff.map((staff, index) => (
                      <React.Fragment key={staff.id}>
                        {/* แถวที่ 1: ชื่อเจ้าหน้าที่ */}
                        <tr className="staff-name-row">
                          <td className="order-cell" rowSpan="2">{index + 1}</td>
                          <td className="name-cell" rowSpan="2">
                            <div className="staff-name-container">
                              <div className="staff-first-name">{staff.firstName}</div>
                              <div className="staff-last-name">{staff.lastName}</div>
                              <div className="staff-position" data-position={staff.position}>{staff.position}</div>
                            </div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(currentYear, currentMonth, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                            const cellValue = scheduleData[day]?.[staff.id] || '';
                            
                            return (
                              <td 
                                key={day} 
                                className={`schedule-cell ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''}`}
                                onClick={() => setSelectedCell({ day, staffId: staff.id })}
                                data-day={day}
                                data-staff={staff.id}
                              >
                                <input
                                  type="text"
                                  value={cellValue}
                                  onChange={(e) => handleCellInput(day, staff.id, e.target.value)}
                                  onKeyDown={(e) => canEdit() ? handleKeyDown(e, day, staff.id) : null}
                                  className="cell-input"
                                  placeholder=""
                                  disabled={!canEdit()}
                                />
                              </td>
                            );
                          })}
                          <td className="total-cell" rowSpan="2">
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const day = i + 1;
                              return scheduleData[day]?.[staff.id] || '';
                            }).filter(value => value !== '').length}
                          </td>
                        </tr>
                        {/* แถวที่ 2: พิมพ์อะไรก็ได้ */}
                        <tr className="staff-extra-row">
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(currentYear, currentMonth, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                            const extraValue = scheduleData[day]?.[`${staff.id}_extra`] || '';
                            
                            return (
                              <td 
                                key={day} 
                                className={`schedule-cell extra ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''}`}
                                onClick={() => setSelectedCell({ day, staffId: `${staff.id}_extra` })}
                                data-day={day}
                                data-staff={`${staff.id}_extra`}
                              >
                                <input
                                  type="text"
                                  value={extraValue}
                                  onChange={(e) => handleCellInput(day, `${staff.id}_extra`, e.target.value)}
                                  onKeyDown={(e) => canEdit() ? handleKeyDown(e, day, `${staff.id}_extra`) : null}
                                  className="cell-input extra"
                                  placeholder=""
                                  disabled={!canEdit()}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
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
