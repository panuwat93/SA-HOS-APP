import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './StaffCalendar.css';

function StaffCalendar({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [taskData, setTaskData] = useState({});
  const [loading, setLoading] = useState(true);

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
      
      // ดึงข้อมูลตารางเวรจาก schedules collection
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const schedules = {};
      
      schedulesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // กรองเฉพาะเดือน/ปีที่ต้องการ
        if (data.month === month && data.year === year) {
          schedules[doc.id] = data;
        }
      });
      
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
      // ดึงข้อมูลงานจาก taskAssignments collection เฉพาะของ user ที่ login
      const tasksSnapshot = await getDocs(collection(db, 'taskAssignments'));
      const tasks = {};
      
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.assignments) {
          // ตรวจสอบงานในแต่ละกะ
          Object.entries(data.assignments).forEach(([shiftId, shiftData]) => {
            // ตรวจสอบข้อมูลใน staffRow (พยาบาล)
            if (shiftData.staffRow) {
              Object.entries(shiftData.staffRow).forEach(([staffId, staffData]) => {
                // ตรวจสอบว่าเป็นงานของ user นี้หรือไม่
                const isUserTask = 
                  staffId === user.uid ||
                  staffId === user.id ||
                  (user.firstName && user.lastName && 
                   (staffId === `${user.firstName} ${user.lastName}` || 
                    staffId.includes(`${user.firstName} ${user.lastName}`)));
                
                if (isUserTask && staffData) {
                  const date = data.date;
                  if (!tasks[date]) {
                    tasks[date] = [];
                  }
                  tasks[date].push({
                    type: staffData.type || 'งานพยาบาล',
                    bedId: staffData.assignedBed || 'ไม่ระบุเตียง',
                    duty: staffData.nurseDuty || '',
                    ert: staffData.nurseErt || '',
                    drugControl: staffData.nurseDrugControl || false,
                    shiftId: shiftId,
                    date: date,
                    role: 'พยาบาล'
                  });
                }
              });
            }
            
            // ตรวจสอบข้อมูลใน assistantRow (ผู้ช่วย)
            if (shiftData.assistantRow) {
              Object.entries(shiftData.assistantRow).forEach(([staffId, staffData]) => {
                // ตรวจสอบว่าเป็นงานของ user นี้หรือไม่
                const isUserTask = 
                  staffId === user.uid ||
                  staffId === user.id ||
                  (user.firstName && user.lastName && 
                   (staffId === `${user.firstName} ${user.lastName}` || 
                    staffId.includes(`${user.firstName} ${user.lastName}`)));
                
                if (isUserTask && staffData) {
                  const date = data.date;
                  if (!tasks[date]) {
                    tasks[date] = [];
                  }
                  tasks[date].push({
                    type: 'งานผู้ช่วย',
                    bedId: 'ไม่ระบุเตียง',
                    duty: '',
                    ert: staffData.assistantErt || '',
                    team: staffData.assistantTeam || '',
                    shiftId: shiftId,
                    date: date,
                    role: 'ผู้ช่วย'
                  });
                }
              });
            }
            
            // รองรับโครงสร้างข้อมูลเก่า (backward compatibility)
            Object.entries(shiftData).forEach(([bedId, bedData]) => {
              if (bedData.staff && typeof bedData.staff === 'string') {
                // กรองเฉพาะงานของ user นี้
                const isUserTask = 
                  bedData.staff === user.uid ||
                  bedData.staff === user.id ||
                  (user.firstName && user.lastName && 
                   (bedData.staff === `${user.firstName} ${user.lastName}` || 
                    bedData.staff.includes(`${user.firstName} ${user.lastName}`)));
                
                if (isUserTask) {
                  const date = data.date;
                  if (!tasks[date]) {
                    tasks[date] = [];
                  }
                  tasks[date].push({
                    ...bedData,
                    shiftId,
                    bedId,
                    date
                  });
                }
              }
            });
          });
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
    const dateStr = date.toISOString().split('T')[0];
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const day = date.getDate();
    
    // ค้นหาเวรใน scheduleData
    let shifts = []; // เปลี่ยนเป็น array เพื่อเก็บเวรหลายเวร
    
    Object.entries(scheduleData).forEach(([scheduleId, schedule]) => {
      if (schedule.month === month && schedule.year === year && schedule.shifts) {
        // ค้นหาจากวันที่
        const dayShifts = schedule.shifts[day];
        if (dayShifts) {
          // ตรวจสอบว่า user.id ตรงกับ staffId ใดในตารางเวร
          Object.entries(dayShifts).forEach(([staffId, shiftData]) => {
            // ตรวจสอบว่าเป็นเวรของ user นี้หรือไม่ (รวม _extra ด้วย)
            const isUserShift = 
              staffId === user.id || 
              staffId === user.uid ||
              staffId === `${user.id}_extra` || 
              staffId === `${user.uid}_extra` ||
              (user.firstName && user.lastName && 
               (staffId === `${user.firstName} ${user.lastName}` || 
                staffId === `${user.firstName} ${user.lastName}_extra` ||
                staffId.includes(`${user.firstName} ${user.lastName}`)));
            
            if (isUserShift) {
              // ข้อมูลเวรอาจเป็น JSON string หรือ plain text
              if (typeof shiftData === 'string') {
                let parsedShift;
                
                try {
                  // ลอง parse เป็น JSON ก่อน
                  parsedShift = JSON.parse(shiftData);
                } catch (e) {
                  // ถ้า parse ไม่ได้ ให้สร้าง object ใหม่จาก plain text
                  parsedShift = {
                    text: shiftData,
                    color: '#000000', // default สีดำ
                    fontSize: '14'
                  };
                }
                
                // เพิ่มเวรเข้า array
                shifts.push({
                  ...parsedShift,
                  staffId,
                  shiftData: parsedShift
                });
              }
            }
          });
        }
      }
    });
    
    if (shifts.length > 0) {
      // แสดงเวรทั้งหมดที่เจอ
      return (
        <div className="shifts-container">
          {shifts.map((shift, index) => {
            // ใช้ข้อความจริงจากตารางเวร
            let shiftText = shift.text;
            let backgroundColor = '#FFFF00'; // default: พื้นเหลือง
            let textColor = '#000000'; // default: ข้อความดำ
            
            // กำหนดสีตามข้อความที่กำหนด
            if (shiftText === 'MB') {
              backgroundColor = '#00FF00'; // พื้นเขียว
              textColor = shift.color || '#000000'; // ใช้สีจากตารางเวร หรือ default ดำ
            } else if (shiftText === 'O') {
              backgroundColor = '#FFFFFF'; // พื้นขาว
              textColor = shift.color || '#FF0000'; // ใช้สีจากตารางเวร หรือ default แดง
            } else if (shiftText === 'VA') {
              backgroundColor = '#FF0000'; // พื้นแดง
              textColor = shift.color || '#FFFFFF'; // ใช้สีจากตารางเวร หรือ default ขาว
            } else if (shiftText === 'ช' || shiftText === 'บ' || shiftText === 'ด') {
              // ช/บ/ด ใช้สีตามตารางเวร
              if (shift.color === '#000000') {
                // สีดำในตารางเวร → พื้นขาว อักษรดำ
                backgroundColor = '#FFFFFF';
                textColor = '#000000';
              } else if (shift.color === '#FF0000') {
                // สีแดงในตารางเวร → พื้นขาว อักษรแดง
                backgroundColor = '#FFFFFF';
                textColor = '#FF0000';
              } else {
                // สีอื่นๆ → ใช้สีจากตารางเวร
                backgroundColor = shift.color || '#FFFF00';
                textColor = '#000000';
              }
            } else {
              // ข้อความอื่นๆ (IM, ประชุม, อื่นๆ)
              backgroundColor = '#FFFF00'; // พื้นเหลือง
              textColor = shift.color || '#000000'; // ใช้สีจากตารางเวร หรือ default ดำ
            }
            
            return (
              <div 
                key={index}
                className="shift-indicator"
                style={{ 
                  backgroundColor: backgroundColor,
                  color: textColor,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: '1px solid #ddd',
                  marginBottom: index < shifts.length - 1 ? '2px' : '0' // เว้นระยะระหว่างเวร
                }}
                title={`เวร: ${shift.text}${shift.color ? ` (สี: ${shift.color})` : ''}`}
              >
                {shiftText}
              </div>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

  // แสดงรายละเอียดเมื่อคลิกวัน
  const showDateDetails = (date) => {
    // ไม่ต้องทำอะไร - เอา modal ออก
  };

  // ปิด modal
  const closeDetailModal = () => {
    // ไม่ต้องทำอะไร - เอา modal ออก
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
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
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
            >
              <div className="day-number">{date.getDate()}</div>
              {isCurrentMonth(date) && renderShift(date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StaffCalendar;