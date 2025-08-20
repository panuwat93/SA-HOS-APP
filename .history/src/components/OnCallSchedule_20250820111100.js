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
    // ตรวจสอบสิทธิ์การแก้ไข
    if (!user?.canEditSchedule && user?.role !== 'admin') {
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

  // บันทึกตารางเวร
  const saveSchedule = async () => {
    try {
      const scheduleId = `oncall_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'oncallSchedules', scheduleId), {
        month: currentMonth + 1,
        year: currentYear,
        scheduleData,
        updatedAt: new Date().toISOString()
      });
      showPopup('บันทึกตารางเวร On Call เรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving schedule:', error);
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
        // สร้างวันหยุดตามปีและเดือนที่เลือก (ตัวอย่าง)
        const sampleHolidays = getSampleThaiHolidays(year, month);
        setHolidays(sampleHolidays);
      }
    } catch (error) {
      console.error('Error loading holidays from DB:', error);
      // ถ้าเกิดข้อผิดพลาดในการโหลดจาก DB ให้โหลดวันหยุดตามปีและเดือนที่เลือก (ตัวอย่าง)
      const sampleHolidays = getSampleThaiHolidays(currentYear, currentMonth + 1);
      setHolidays(sampleHolidays);
    } finally {
      setHolidayLoading(false);
    }
  };

  // บันทึกวันหยุด
  const saveHolidays = async () => {
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
  const removeHoliday = (holidayId) => {
    setHolidays(prev => prev.filter(h => h.id !== holidayId));
  };

  // เพิ่มวันหยุด
  const addHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      const holiday = {
        id: `custom_${Date.now()}`,
        date: newHoliday.date,
        name: newHoliday.name,
        type: 'เพิ่มเติม'
      };
      
      setHolidays(prev => [...prev, holiday]);
      setNewHoliday({ date: '', name: '' });
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

  // ฟังก์ชันสำหรับดึงข้อมูลวันหยุดตามปีและเดือน (ตัวอย่าง)
  const getSampleThaiHolidays = (year, month) => {
    const sampleHolidays = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // วันหยุดประจำปี (ตัวอย่าง)
    const fixedHolidays = [
      { date: `${year}-01-01`, name: 'วันขึ้นปีใหม่', type: 'วันหยุด' },
      { date: `${year}-04-06`, name: 'วันสงกรานต์', type: 'วันหยุด' },
      { date: `${year}-04-13`, name: 'วันสวรรค์ตรี', type: 'วันหยุด' },
      { date: `${year}-05-01`, name: 'วันสงกรานต์', type: 'วันหยุด' },
      { date: `${year}-05-05`, name: 'วันสวรรค์ตรี', type: 'วันหยุด' },
      { date: `${year}-07-15`, name: 'วันสงกรานต์', type: 'วันหยุด' },
      { date: `${year}-07-28`, name: 'วันสวรรค์ตรี', type: 'วันหยุด' },
      { date: `${year}-10-23`, name: 'วันสงกรานต์', type: 'วันหยุด' },
      { date: `${year}-10-24`, name: 'วันสวรรค์ตรี', type: 'วันหยุด' },
      { date: `${year}-12-05`, name: 'วันสงกรานต์', type: 'วันหยุด' },
      { date: `${year}-12-25`, name: 'วันสวรรค์ตรี', type: 'วันหยุด' },
    ];
    sampleHolidays.push(...fixedHolidays);

    // วันหยุดประจำเดือน (ตัวอย่าง)
    const monthHolidays = [
      { date: `${year}-${month}-01`, name: 'วันหยุดประจำเดือน', type: 'วันหยุด' },
      { date: `${year}-${month}-15`, name: 'วันหยุดประจำเดือน', type: 'วันหยุด' },
      { date: `${year}-${month}-20`, name: 'วันหยุดประจำเดือน', type: 'วันหยุด' },
    ];
    sampleHolidays.push(...monthHolidays);

    // วันหยุดสุ่ม (ตัวอย่าง)
    const randomHolidays = [
      { date: `${year}-${month}-03`, name: 'วันหยุดสุ่ม 1', type: 'วันหยุด' },
      { date: `${year}-${month}-10`, name: 'วันหยุดสุ่ม 2', type: 'วันหยุด' },
      { date: `${year}-${month}-17`, name: 'วันหยุดสุ่ม 3', type: 'วันหยุด' },
    ];
    sampleHolidays.push(...randomHolidays);

    return sampleHolidays;
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
            {(user?.canEditSchedule || user?.role === 'admin') && (
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
          {(user?.canEditSchedule || user?.role === 'admin') && (
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
                        {(user?.canEditSchedule || user?.role === 'admin') && (
                          <button
                            onClick={() => removeHoliday(holiday.id)}
                            className="remove-holiday-btn"
                            title="ลบวันหยุด"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="no-holidays">ไม่มีวันหยุดในเดือนนี้</div>
                  );
                })()}
              </div>

              {/* ฟอร์มเพิ่มวันหยุด - แสดงเฉพาะแอดมิน */}
              {(user?.canEditSchedule || user?.role === 'admin') && (
                <div className="add-holiday-form">
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    className="holiday-date-input"
                    placeholder="เลือกวันที่"
                  />
                  <input
                    type="text"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                    className="holiday-name-input"
                    placeholder="ชื่อวันหยุด"
                  />
                  <button
                    onClick={addHoliday}
                    className="btn btn-primary add-holiday-btn"
                    disabled={!newHoliday.date || !newHoliday.name}
                  >
                    ➕ เพิ่ม
                  </button>
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
                👩‍⚕️ พยาบาล ({nurseStaff.length} คน) - วันทำการ: {daysInMonth} วัน
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
                                  className="cell-input"
                                  placeholder=""
                                  disabled={!(user?.canEditSchedule || user?.role === 'admin')}
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
                                  className="cell-input extra"
                                  placeholder=""
                                  disabled={!(user?.canEditSchedule || user?.role === 'admin')}
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
                👥 กลุ่มผู้ช่วย ({assistantStaff.length} คน) - วันทำการ: {daysInMonth} วัน
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
                                  className="cell-input"
                                  placeholder=""
                                  disabled={!(user?.canEditSchedule || user?.role === 'admin')}
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
                                  className="cell-input extra"
                                  placeholder=""
                                  disabled={!(user?.canEditSchedule || user?.role === 'admin')}
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
