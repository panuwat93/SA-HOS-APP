import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './StaffCalendar.css';

function StaffCalendar({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [taskData, setTaskData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // โหลดข้อมูลตารางเวร
  useEffect(() => {
    if (user) {
      loadScheduleData();
      loadTaskData();
    }
  }, [user, currentDate]);

  // โหลดข้อมูลตารางเวร
  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      console.log('🔍 Calendar - Loading schedules for month:', month, 'year:', year);
      
      // ดึงข้อมูลตารางเวรจาก schedules collection
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const schedules = {};
      
      schedulesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 Calendar - Schedule data:', data);
        
        // ตรวจสอบข้อมูลที่มีอยู่จริง
        if (data.shifts) {
          // เก็บข้อมูลทั้งหมดที่มี shifts
          schedules[doc.id] = data;
        }
      });
      
      console.log('🔍 Calendar - Loaded schedules:', schedules);
      setScheduleData(schedules);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลงานที่มอบหมาย
  const loadTaskData = async () => {
    try {
      // ดึงข้อมูลงานจาก tasks collection
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const tasks = {};
      
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        // กรองเฉพาะงานของ user นี้
        if (data.assignedTo === user.uid || 
            (data.assignedTo === `${user.firstName} ${user.lastName}`)) {
          const date = data.date;
          if (!tasks[date]) {
            tasks[date] = [];
          }
          tasks[date].push(data);
        }
      });
      
      setTaskData(tasks);
    } catch (error) {
      console.error('Error loading task data:', error);
    }
  };

  // สร้างปฏิทินรายเดือน
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // เริ่มจากวันอาทิตย์ของสัปดาห์แรก
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    while (currentDateObj <= endDate || days.length < 42) {
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  // แสดงเวรในช่องวัน
  const renderShift = (date) => {
    const day = date.getDate();
    
    // ค้นหาเวรใน scheduleData
    let shift = null;
    Object.values(scheduleData).forEach(schedule => {
      if (schedule.shifts && schedule.shifts[day]) {
        // ค้นหาจากชื่อ-นามสกุลใน shifts ของวันนั้น
        const dayShifts = schedule.shifts[day];
        Object.values(dayShifts).forEach(shiftData => {
          if (typeof shiftData === 'string' && 
              shiftData.includes(`${user.firstName} ${user.lastName}`)) {
            shift = shiftData;
          }
        });
      }
    });
    
    if (shift) {
      let shiftColor = '#4CAF50'; // เริ่มต้นสีเขียว
      let shiftText = shift;
      
      // กำหนดสีตามเวร
      if (shift.includes('เช้า') || shift.includes('Morning')) {
        shiftColor = '#4CAF50'; // เขียว
        shiftText = 'เช้า';
      } else if (shift.includes('บ่าย') || shift.includes('Afternoon')) {
        shiftColor = '#FF9800'; // ส้ม
        shiftText = 'บ่าย';
      } else if (shift.includes('ดึก') || shift.includes('Night')) {
        shiftColor = '#2196F3'; // น้ำเงิน
        shiftText = 'ดึก';
      }
      
      return (
        <div 
          className="shift-indicator"
          style={{ backgroundColor: shiftColor }}
          title={shift}
        >
          {shiftText}
        </div>
      );
    }
    
    return null;
  };

  // แสดงรายละเอียดเมื่อคลิกวัน
  const showDateDetails = (date) => {
    setSelectedDate(date);
    setShowDetailModal(true);
  };

  // ปิด modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDate(null);
  };

  // เปลี่ยนเดือน
  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // ชื่อเดือนภาษาไทย
  const getThaiMonthName = (date) => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[date.getMonth()];
  };

  // ชื่อวันภาษาไทย
  const getThaiDayName = (date) => {
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    return days[date.getDay()];
  };

  // ตรวจสอบว่าเป็นวันปัจจุบัน
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // ตรวจสอบว่าเป็นเดือนปัจจุบัน
  const isCurrentMonth = (date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="loading-spinner">กำลังโหลดปฏิทิน...</div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="calendar-container">
      {/* Debug Info */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        marginBottom: '20px', 
        borderRadius: '8px',
        border: '1px solid #e1e8ed',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>🔍 Debug Info:</strong>
            <div>User: {user?.firstName} {user?.lastName}</div>
            <div>Loaded schedules: {Object.keys(scheduleData).length}</div>
            <div>Schedule IDs: {Object.keys(scheduleData).join(', ')}</div>
            <div>Current month: {currentDate.getMonth() + 1}</div>
            <div>Current year: {currentDate.getFullYear()}</div>
          </div>
          <button 
            onClick={() => {
              loadScheduleData();
              loadTaskData();
            }}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      {/* Header ปฏิทิน */}
      <div className="calendar-header">
        <button 
          className="month-nav-btn prev"
          onClick={() => changeMonth('prev')}
        >
          ◀
        </button>
        <h2 className="current-month">
          {getThaiMonthName(currentDate)} {currentDate.getFullYear()}
        </h2>
        <button 
          className="month-nav-btn next"
          onClick={() => changeMonth('next')}
        >
          ▶
        </button>
      </div>

      {/* ปฏิทิน */}
      <div className="calendar-grid">
        {/* หัวตารางวัน */}
        <div className="calendar-weekdays">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>

        {/* ช่องวัน */}
        <div className="calendar-days">
          {calendarDays.map((date, index) => (
            <div
              key={index}
              className={`calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${isToday(date) ? 'today' : ''}`}
              onClick={() => showDateDetails(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              {isCurrentMonth(date) && renderShift(date)}
            </div>
          ))}
        </div>
      </div>

      {/* Modal แสดงรายละเอียด */}
      {showDetailModal && selectedDate && (
        <div className="detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>รายละเอียดวันที่ {selectedDate.getDate()} {getThaiMonthName(selectedDate)} {selectedDate.getFullYear()}</h3>
              <button className="close-btn" onClick={closeDetailModal}>×</button>
            </div>
            <div className="modal-body">
              <DateDetails 
                date={selectedDate} 
                user={user} 
                scheduleData={scheduleData} 
                taskData={taskData} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// คอมโพเนนต์แสดงรายละเอียดวัน
function DateDetails({ date, user, scheduleData, taskData }) {
  const dateStr = date.toISOString().split('T')[0];
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // หาเวรของวันนี้
  let todayShift = null;
  Object.values(scheduleData).forEach(schedule => {
    if (schedule.month === month && schedule.year === year && schedule.shifts) {
      Object.values(schedule.shifts).forEach(shiftData => {
        if (typeof shiftData === 'string' && 
            shiftData.includes(`${user.firstName} ${user.lastName}`)) {
          todayShift = shiftData;
        }
      });
    }
  });

  // หางานที่มอบหมายของวันนี้
  const todayTasks = taskData[dateStr] || [];

  return (
    <div className="date-details">
      {/* ข้อมูลเวร */}
      <div className="detail-section">
        <h4>📅 เวร</h4>
        {todayShift ? (
          <div className="shift-info">
            <span className="shift-badge">{todayShift}</span>
          </div>
        ) : (
          <p className="no-data">ไม่มีเวรในวันนี้</p>
        )}
      </div>

      {/* ข้อมูลงานที่มอบหมาย */}
      <div className="detail-section">
        <h4>📋 งานที่มอบหมาย</h4>
        {todayTasks.length > 0 ? (
          <div className="tasks-list">
            {todayTasks.map((task, index) => (
              <div key={index} className="task-item">
                <div className="task-title">{task.title}</div>
                <div className="task-details">
                  {task.bed && <span className="task-bed">เตียง: {task.bed}</span>}
                  {task.team && <span className="task-team">ทีม: {task.team}</span>}
                  {task.ert && <span className="task-ert">ERT: {task.ert}</span>}
                  {task.duty && <span className="task-duty">หน้าที่: {task.duty}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">ไม่มีงานที่มอบหมายในวันนี้</p>
        )}
      </div>
    </div>
  );
}

export default StaffCalendar;
