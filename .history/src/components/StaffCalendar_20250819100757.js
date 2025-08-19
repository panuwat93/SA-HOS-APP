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
      
      console.log(`📅 Loading schedule data for month: ${month}, year: ${year}`);
      
      // ดึงข้อมูลตารางเวรจาก schedules collection
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const schedules = {};
      
      console.log(`📅 Found ${schedulesSnapshot.size} schedule documents`);
      
      schedulesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📅 Schedule document ${doc.id}:`, data);
        if (data.month === month && data.year === year) {
          schedules[doc.id] = data;
          console.log(`📅 Added schedule for month ${month}, year ${year}:`, data);
        }
      });
      
      setScheduleData(schedules);
      console.log('📅 Final scheduleData:', schedules); // Debug log
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลงานที่มอบหมาย
  const loadTaskData = async () => {
    try {
      console.log('📋 Loading task data for user:', user);
      
      // ดึงข้อมูลงานจาก tasks collection
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const tasks = {};
      
      console.log(`📋 Found ${tasksSnapshot.size} task documents`);
      
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📋 Task document ${doc.id}:`, data);
        // กรองเฉพาะงานของ user นี้
        if (data.assignedTo === user.uid || 
            (data.assignedTo === `${user.firstName} ${user.lastName}`)) {
          const date = data.date;
          if (!tasks[date]) {
            tasks[date] = [];
          }
          tasks[date].push(data);
          console.log(`📋 Added task for date ${date}:`, data);
        }
      });
      
      setTaskData(tasks);
      console.log('📋 Final taskData:', tasks);
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
    const dateStr = date.toISOString().split('T')[0];
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const day = date.getDate();
    
    // Debug log
    console.log(`🔍 Checking shifts for date: ${dateStr}, month: ${month}, year: ${year}, day: ${day}`);
    console.log('🔍 Current scheduleData:', scheduleData);
    
    // ค้นหาเวรใน scheduleData
    let shift = null;
    let shiftColor = '#4CAF50'; // เริ่มต้นสีเขียว
    
    Object.values(scheduleData).forEach(schedule => {
      if (schedule.month === month && schedule.year === year && schedule.shifts) {
        console.log(`🔍 Found matching schedule for month ${month}, year ${year}:`, schedule);
        // ค้นหาเวรตามวันที่ (day)
        if (schedule.shifts[day]) {
          console.log(`🔍 Found shifts for day ${day}:`, schedule.shifts[day]);
          // วนลูปผ่านทุก ID ในวันนั้น
          Object.values(schedule.shifts[day]).forEach(shiftData => {
            console.log(`🔍 Processing shift data:`, shiftData);
            if (shiftData && typeof shiftData === 'object' && shiftData.text) {
              // ตรวจสอบว่าเป็นเวรของ user นี้หรือไม่
              // เนื่องจากข้อมูลใน shifts ไม่มีชื่อ user จึงแสดงทุกเวรในวันนั้น
              shift = shiftData.text;
              shiftColor = shiftData.color || '#4CAF50';
              console.log(`🔍 Found shift: ${shift} with color: ${shiftColor}`);
            }
          });
        } else {
          console.log(`🔍 No shifts found for day ${day}`);
        }
      }
    });
    
    if (shift) {
      let shiftText = shift;
      
      // แปลงตัวอักษรเป็นชื่อเวรที่เข้าใจง่าย
      if (shift === 'ช') {
        shiftText = 'เช้า';
        shiftColor = '#4CAF50'; // เขียว
      } else if (shift === 'บ') {
        shiftText = 'บ่าย';
        shiftColor = '#FF9800'; // ส้ม
      } else if (shift === 'ด') {
        shiftText = 'ดึก';
        shiftColor = '#2196F3'; // น้ำเงิน
      }
      
      console.log(`🔍 Rendering shift: ${shiftText} with color: ${shiftColor}`);
      
      return (
        <div 
          className="shift-indicator"
          style={{ backgroundColor: shiftColor }}
          title={`เวร${shiftText}`}
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
  const day = date.getDate();

  // หาเวรของวันนี้
  let todayShifts = [];
  Object.values(scheduleData).forEach(schedule => {
    if (schedule.month === month && schedule.year === year && schedule.shifts) {
      if (schedule.shifts[day]) {
        // วนลูปผ่านทุก ID ในวันนั้น
        Object.values(schedule.shifts[day]).forEach(shiftData => {
          if (shiftData && typeof shiftData === 'object' && shiftData.text) {
            let shiftText = shiftData.text;
            let shiftColor = shiftData.color || '#4CAF50';
            
            // แปลงตัวอักษรเป็นชื่อเวรที่เข้าใจง่าย
            if (shiftText === 'ช') {
              shiftText = 'เช้า';
              shiftColor = '#4CAF50';
            } else if (shiftText === 'บ') {
              shiftText = 'บ่าย';
              shiftColor = '#FF9800';
            } else if (shiftText === 'ด') {
              shiftText = 'ดึก';
              shiftColor = '#2196F3';
            }
            
            todayShifts.push({
              text: shiftText,
              color: shiftColor,
              originalText: shiftData.text
            });
          }
        });
      }
    }
  });

  // หางานที่มอบหมายของวันนี้
  const todayTasks = taskData[dateStr] || [];

  return (
    <div className="date-details">
      {/* ข้อมูลเวร */}
      <div className="detail-section">
        <h4>📅 เวร</h4>
        {todayShifts.length > 0 ? (
          <div className="shift-info">
            {todayShifts.map((shift, index) => (
              <span 
                key={index} 
                className="shift-badge"
                style={{ backgroundColor: shift.color }}
              >
                {shift.text}
              </span>
            ))}
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
