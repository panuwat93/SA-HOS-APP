import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './TaskAssignment.css';

// Custom Popup Component
const CustomPopup = ({ message, type = 'success', onClose, isVisible }) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '💬';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'linear-gradient(135deg, #A5D6A7 0%, #81C784 100%)';
      case 'error': return 'linear-gradient(135deg, #EF9A9A 0%, #E57373 100%)';
      case 'warning': return 'linear-gradient(135deg, #FFE082 0%, #FFB74D 100%)';
      case 'info': return 'linear-gradient(135deg, #90CAF9 0%, #64B5F6 100%)';
      default: return 'linear-gradient(135deg, #E1BEE7 0%, #BA68C8 100%)';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success': return '#2E7D32';
      case 'error': return '#C62828';
      case 'warning': return '#F57C00';
      case 'info': return '#1565C0';
      default: return '#6A1B9A';
    }
  };

  return (
    <div className="custom-popup-overlay">
      <div 
        className="custom-popup"
        style={{
          background: getBackgroundColor(),
          color: getTextColor()
        }}
      >
        <div className="popup-icon">{getIcon()}</div>
        <div className="popup-message">{message}</div>
        <button 
          className="popup-close-btn"
          onClick={onClose}
          style={{ color: getTextColor() }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

function TaskAssignment({ user }) {
  const [staffList, setStaffList] = useState([]);
  const [taskData, setTaskData] = useState({});
  const [scheduleData, setScheduleData] = useState({}); // เพิ่ม state สำหรับตารางเวร
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

  // ฟังก์ชันแสดง popup
  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    // ปิด popup อัตโนมัติหลังจาก 3 วินาที
    setTimeout(() => {
      setPopup({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ฟังก์ชันปิด popup
  const closePopup = () => {
    setPopup({ show: false, message: '', type: 'success' });
  };

  // ข้อมูลเตียง/สถานี
  const bedStations = [
    { id: 'B1-B3', name: 'B1-B3' },
    { id: 'B4-Y2', name: 'B4-Y2' },
    { id: 'B5-B7', name: 'B5-B7' },
    { id: 'Y3-Y4', name: 'Y3-Y4' },
    { id: 'B1-B2', name: 'B1-B2' },
    { id: 'B3-B4', name: 'B3-B4' },
    { id: 'Y1-Y2', name: 'Y1-Y2' }
  ];

  // ข้อมูลเวร
  const shifts = [
    { id: 'night', name: 'เวรดึก', color: '#fce4ec', icon: '🌙' },
    { id: 'morning', name: 'เวรเช้า', color: '#e8f5e8', icon: '🌅' },
    { id: 'afternoon', name: 'เวรบ่าย', color: '#fff3cd', icon: '☀️' }
  ];

  // ข้อมูลประเภท
  const taskTypes = [
    { value: 'type4', label: 'ประเภทที่ 4' },
    { value: 'type5', label: 'ประเภทที่ 5' }
  ];

  // ข้อมูลหน้าที่
  const duties = [
    { value: 'productivity', label: 'Productivity', color: '#fce4ec' },
    { value: 'registration', label: 'ลงทะเบียน / จองเตียง', color: '#ffeaa7' },
    { value: 'pipeline', label: 'Pipe line', color: '#e8f5e8' },
    { value: 'medicine', label: 'ยา Stock', color: '#fff3cd' },
    { value: 'productivity_check', label: 'Productivity / Check Delfib', color: '#fce4ec' },
    { value: 'pipeline_emergency', label: 'Pipe line / รถ Emergency', color: '#e8f5e8' }
  ];

  // ข้อมูล ERT
  const ertRoles = [
    { value: 'life_support', label: 'เคลื่อนย้ายกู้ชีพ' },
    { value: 'life_check', label: 'เช็คชีวิตติดต่อ' },
    { value: 'team_leader', label: 'หัวหน้าแผน' },
    { value: 'firefighting', label: 'ดับเพลิง' },
    { value: 'technician', label: 'ช่างและเส้นทาง' }
  ];

  // ข้อมูลทีม
  const teams = [
    { value: 'team_a', label: 'TEAM A', color: '#a8e6cf' },
    { value: 'team_b', label: 'TEAM B', color: '#ffb3ba' }
  ];

  // โหลดรายชื่อเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
  }, []);

  // โหลดข้อมูลมอบหมายงานเมื่อเปลี่ยนวันที่
  useEffect(() => {
    if (staffList.length > 0) {
      console.log('📅 เปลี่ยนวันที่, โหลดข้อมูลใหม่...');
      console.log('👥 Staff list:', staffList);
      loadTaskData();
      loadScheduleData(); // เพิ่มการโหลดข้อมูลตารางเวร
    }
  }, [staffList, currentDate]);

  const loadStaff = async () => {
    try {
      console.log('👥 กำลังโหลดรายชื่อเจ้าหน้าที่...');
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staff = [];
      querySnapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      console.log('✅ โหลดเจ้าหน้าที่สำเร็จ:', staff);
      setStaffList(staff);
    } catch (error) {
      console.error('❌ Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลตารางเวร
  const loadScheduleData = async () => {
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // ลองดึงจากหลาย collection ที่เป็นไปได้
      const possibleCollections = ['schedules', 'schedule', 'dutySchedule', 'duty_schedule'];
      let foundData = null;
      let foundCollection = null;
      
      for (const collectionName of possibleCollections) {
        try {
          // ลองหลายรูปแบบ ID
          const possibleIds = [
            `schedule_${dateString}`,                    // schedule_2024-08-12
            `schedule_${dateString.replace(/-/g, '_')}`, // schedule_2024_08_12
            `${dateString.replace(/-/g, '_')}`,          // 2024_08_12
            `${dateString.replace(/-/g, '')}`,           // 20240812
            `schedule_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}` // schedule_2024_8
          ];
          
          for (const scheduleId of possibleIds) {
            const scheduleDoc = await getDoc(doc(db, collectionName, scheduleId));
            if (scheduleDoc.exists()) {
              foundData = scheduleDoc.data();
              foundCollection = collectionName;
              break;
            }
          }
          
          if (foundData) break;
        } catch (err) {
          // ไม่สามารถดึงข้อมูลได้
        }
      }
      
      if (foundData) {
        // ข้อมูลอยู่ที่ root level ไม่ใช่ใน assignments field
        setScheduleData(foundData);
        showPopup(`ดึงข้อมูลสำเร็จจาก ${foundCollection}!`, 'success');
      } else {

        setScheduleData({});
        showPopup('ไม่พบข้อมูลตารางเวรในวันที่เลือก กรุณาตรวจสอบ collection และ ID', 'warning');
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setScheduleData({});
      showPopup('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    }
  };

  const loadTaskData = async () => {
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const taskId = `tasks_${dateString}`;
      const taskDoc = await getDoc(doc(db, 'taskAssignments', taskId));
      
      if (taskDoc.exists()) {
        setTaskData(taskDoc.data().assignments || {});
      } else {
        // สร้างตารางเปล่า
        const emptyTaskData = {};
        shifts.forEach(shift => {
          emptyTaskData[shift.id] = {};
          bedStations.forEach(bed => {
            emptyTaskData[shift.id][bed.id] = {
              type: '',
              staff: '',
              duty: '',
              drugControl: false,
              ert: '',
              breakTime: '',
              team: '',
              teamErt: '',
              pnNa: '',
              teamBreakTime: ''
            };
          });
        });
        setTaskData(emptyTaskData);
      }
    } catch (error) {
      console.error('Error loading task data:', error);
    }
  };

  // บันทึกข้อมูลมอบหมายงาน
  const saveTaskData = async () => {
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const taskId = `tasks_${dateString}`;
      await setDoc(doc(db, 'taskAssignments', taskId), {
        date: dateString,
        assignments: taskData,
        updatedAt: new Date().toISOString()
      });
      showPopup('บันทึกการมอบหมายงานเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving task data:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  // ดึงรายชื่อคนที่มีเวรในแต่ละกะ
  const getStaffOnShift = (shiftId) => {
    
    // แก้ไข: ข้อมูลอยู่ใน scheduleData.shifts[วันที่] ไม่ใช่ scheduleData.shifts[shiftId]
    const currentDay = currentDate.getDate(); // ได้วันที่ 12
    
    const dayData = scheduleData.shifts?.[currentDay] || {};
    
    // ข้อมูลกะอยู่ใน dayData[shiftId] - แต่ข้อมูลจริงอาจจะไม่ได้แยกตามกะ
    // ลองดูข้อมูลทั้งหมดของวันที่นั้น
    
    // ข้อมูลอาจจะเป็น: {staffId1: '{"text":"ช",...}', staffId2: '{"text":"ด",...}'}
    // โดยที่ "ช" = เช้า, "ด" = ดึก, "บ" = บ่าย
    const staffOnShift = {
      nurses: [],
      assistants: []
    };

    // ตรวจสอบ staffList
    
    // วนลูปผ่านข้อมูลทั้งหมดของวันที่นั้น
    Object.entries(dayData).forEach(([staffId, shiftInfo]) => {
      
      // shiftInfo เป็น JSON string ที่มี text: "ช", "ด", "บ"
      let shiftText = '';
      try {
        const parsedInfo = JSON.parse(shiftInfo);
        shiftText = parsedInfo.text;
      } catch (e) {
        return;
      }
      
      // ตรวจสอบว่าเวรตรงกับกะที่ต้องการหรือไม่
      let isCorrectShift = false;
      if (shiftId === 'morning' && shiftText === 'ช') {
        isCorrectShift = true;
      } else if (shiftId === 'afternoon' && shiftText === 'บ') {
        isCorrectShift = true;
      } else if (shiftId === 'night' && shiftText === 'ด') {
        isCorrectShift = true;
      }
      
      if (isCorrectShift) {
        
        // หาข้อมูลเจ้าหน้าที่จาก staffList
        // จัดการกับ suffix _extra ที่อาจมีใน scheduleData
        let cleanStaffId = staffId;
        if (staffId.endsWith('_extra')) {
          cleanStaffId = staffId.replace('_extra', '');
        }
        
        const staff = staffList.find(s => s.id === cleanStaffId);
        if (staff) {
          if (staff.position === 'พยาบาล') {
            staffOnShift.nurses.push(staff);
          } else if (['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position)) {
            staffOnShift.assistants.push(staff);
          }
        }
      }
    });

    // เรียงลำดับตามลำดับในตารางเวร (order field)
    
    // เรียงลำดับพยาบาล
    staffOnShift.nurses.sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });
    
    // เรียงลำดับผู้ช่วย
    staffOnShift.assistants.sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });
    
    return staffOnShift;
  };

  // อัพเดทข้อมูลในตาราง
  const updateTaskData = (shiftId, fieldPath, value) => {
    setTaskData(prev => {
      const newData = { ...prev };
      
      // แยก fieldPath เช่น "staffRow.staffId.fieldName"
      const pathParts = fieldPath.split('.');
      let current = newData[shiftId];
      
      // สร้าง object ตาม path ถ้ายังไม่มี
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      // กำหนดค่า
      current[pathParts[pathParts.length - 1]] = value;
      
      return newData;
    });
  };

  // ฟังก์ชันอัพเดทข้อมูลแบบง่าย
  const updateSimpleTaskData = (shiftId, staffId, field, value, isAssistant = false) => {
    const prefix = isAssistant ? 'assistantRow' : 'staffRow';
    const fieldPath = `${prefix}.${staffId}.${field}`;
    
    console.log('🔄 อัพเดทข้อมูล:', {
      shiftId,
      staffId,
      field,
      value,
      isAssistant,
      prefix,
      fieldPath
    });
    
    updateTaskData(shiftId, fieldPath, value);
    
    // แสดงข้อมูลหลังจากอัพเดท
    setTimeout(() => {
      console.log('📊 ข้อมูลหลังจากอัพเดท:', taskData);
    }, 100);
  };

  // เปลี่ยนวันที่
  const changeDate = (direction) => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
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

  // ฟังก์ชันจัดการการเปลี่ยนแปลงวัน
  const handleDayChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setDate(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  // ฟังก์ชันจัดการการเปลี่ยนแปลงเดือน
  const handleMonthChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  // ฟังก์ชันจัดการการเปลี่ยนแปลงปี
  const handleYearChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  // รีเซ็ตตาราง
  const resetTable = () => {
    if (window.confirm('คุณต้องการรีเซ็ตตารางการมอบหมายงานทั้งหมดหรือไม่?')) {
      const emptyTaskData = {};
      shifts.forEach(shift => {
        emptyTaskData[shift.id] = {};
        bedStations.forEach(bed => {
          emptyTaskData[shift.id][bed.id] = {
            type: '',
            staff: '',
            duty: '',
            drugControl: false,
            ert: '',
            breakTime: '',
            team: '',
            teamErt: '',
            pnNa: '',
            teamBreakTime: ''
          };
        });
      });
      setTaskData(emptyTaskData);
    }
  };

  // ส่งออกเป็น Excel
  const exportToExcel = () => {
    // สร้างข้อมูลสำหรับ Excel
    const excelData = [];
    
    // เพิ่มหัวตาราง
    const headers = ['เวร', 'เตียง/สถานี', 'ประเภท', 'เจ้าหน้าที่', 'หน้าที่', 'ดูแลยาเสพติด', 'ERT', 'เวลาพัก', 'TEAM', 'ERT ทีม', 'PN/NA', 'เวลาพักทีม'];
    excelData.push(headers);
    
    // เพิ่มข้อมูลแต่ละเวร
    shifts.forEach(shift => {
      bedStations.forEach(bed => {
        const bedData = taskData[shift.id]?.[bed.id] || {};
        const row = [
          shift.name,
          bed.name,
          bedData.type || '',
          bedData.staff || '',
          bedData.duty || '',
          bedData.drugControl ? '✓' : '',
          bedData.ert || '',
          bedData.breakTime || '',
          bedData.team || '',
          bedData.teamErt || '',
          bedData.pnNa || '',
          bedData.teamBreakTime || ''
        ];
        excelData.push(row);
      });
    });
    
    // สร้าง CSV content
    const csvContent = excelData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `การมอบหมายงาน_${currentDate.toLocaleDateString('th-TH')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="task-assignment">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  // Check task assignment permission
  if (!user?.canAssignTasks) {
    // Show tasks in read-only mode with full admin UI
    return (
      <div className="task-assignment">
        {/* Header Controls */}
        <div className="header-controls">
          <div className="date-navigation">
            <div className="date-selector">
              <label htmlFor="day-select-readonly" className="selector-label">วัน:</label>
              <select 
                id="day-select-readonly"
                value={currentDate.getDate()} 
                onChange={handleDayChange}
                className="date-dropdown day-dropdown"
              >
                {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="month-selector">
              <label htmlFor="month-select-readonly" className="selector-label">เดือน:</label>
              <select 
                id="month-select-readonly"
                value={currentDate.getMonth()} 
                onChange={handleMonthChange}
                className="date-dropdown month-dropdown"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {getMonthNameByIndex(i)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="year-selector">
              <label htmlFor="year-select-readonly" className="selector-label">ปี:</label>
              <select 
                id="year-select-readonly"
                value={currentDate.getFullYear()} 
                onChange={handleYearChange}
                className="date-dropdown year-dropdown"
              >
                {Array.from({ length: 21 }, (_, i) => {
                  const year = currentDate.getFullYear() - 10 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden for read-only */}
        <div className="action-buttons" style={{ display: 'none' }}>
          <button onClick={saveTaskData} className="btn btn-primary">💾 บันทึก</button>
          <button onClick={resetTable} className="btn btn-warning">🔄 รีเซ็ต</button>
          <button onClick={exportToExcel} className="btn btn-success">📊 ส่งออก Excel</button>
        </div>

        {/* Task Tables - Read Only */}
        <div className="task-tables">
          {shifts.map(shift => (
            <div key={shift.id} className="task-table-section">
              <h3 className="table-title">
                {shift.icon} {shift.name}
              </h3>
              <div className="shift-container" data-shift={shift.id}>
                {/* กล่องพยาบาล */}
                <div className="nurse-box">
                  <h4 className="box-title">พยาบาล</h4>
                  <div className="task-table-container">
                    <table className="task-table nurse-table">
                      <thead>
                        <tr>
                          <th className="bed-header">เตียง</th>
                          <th className="staff-header">ชื่อเจ้าหน้าที่</th>
                          <th className="duty-header">หน้าที่</th>
                          <th className="drug-header">ดูแลยาเสพติด</th>
                          <th className="ert-header">ERT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const staffOnShift = getStaffOnShift(shift.id);
                          const nurseStaff = staffOnShift.nurses;
                          
                          if (nurseStaff.length === 0) {
                            return (
                              <tr key={`${shift.id}-no-staff`} style={{ backgroundColor: shift.color }}>
                                <td colSpan="5" className="no-staff-message">
                                  ไม่มีเจ้าหน้าที่ทำงานในวันนี้
                                </td>
                              </tr>
                            );
                          }
                          
                          return nurseStaff.map((staff, index) => {
                            const staffData = taskData[shift.id]?.staffRow?.[staff.id] || {};
                            return (
                              <tr key={`${shift.id}-${staff.id}`} style={{ backgroundColor: shift.color }}>
                                <td className="bed-cell">
                                  <select
                                    value={staffData.assignedBed || ''}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="task-select"
                                    disabled
                                  >
                                    <option value="">เลือกเตียง</option>
                                    {bedStations.map(bedOption => (
                                      <option key={bedOption.id} value={bedOption.id}>
                                        {bedOption.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="staff-cell">
                                  <span className="staff-name">{staff.firstName} {staff.lastName}</span>
                                </td>
                                <td className="duty-cell">
                                  <select
                                    value={staffData.nurseDuty || ''}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="task-select"
                                    disabled
                                    style={{
                                      backgroundColor: duties.find(d => d.value === staffData.nurseDuty)?.color || 'white'
                                    }}
                                  >
                                    <option value="">เลือกหน้าที่</option>
                                    {duties.map(duty => (
                                      <option key={duty.value} value={duty.value}>{duty.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="drug-cell">
                                  <input
                                    type="checkbox"
                                    checked={staffData.nurseDrugControl || false}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="drug-checkbox"
                                    disabled
                                  />
                                </td>
                                <td className="ert-cell">
                                  <select
                                    value={staffData.nurseErt || ''}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="task-select"
                                    disabled
                                  >
                                    <option value="">เลือก ERT</option>
                                    {ertRoles.map(role => (
                                      <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* กล่องผู้ช่วย */}
                <div className="assistant-box">
                  <h4 className="box-title">กลุ่มผู้ช่วย</h4>
                  <div className="task-table-container">
                    <table className="task-table assistant-table">
                      <thead>
                        <tr>
                          <th className="staff-header">ชื่อเจ้าหน้าที่</th>
                          <th className="team-header">Team</th>
                          <th className="ert-header">ERT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const staffOnShift = getStaffOnShift(shift.id);
                          const assistantStaff = staffOnShift.assistants;
                          
                          if (assistantStaff.length === 0) {
                            return (
                              <tr key={`${shift.id}-no-assistant`} style={{ backgroundColor: shift.color }}>
                                <td colSpan="3" className="no-staff-message">
                                  ไม่มีเจ้าหน้าที่ทำงานในวันนี้
                                </td>
                              </tr>
                            );
                          }
                          
                          return assistantStaff.map((staff, index) => {
                            const staffData = taskData[shift.id]?.assistantRow?.[staff.id] || {};
                            return (
                              <tr key={`${shift.id}-assistant-${staff.id}`} style={{ backgroundColor: shift.color }}>
                                <td className="staff-cell">
                                  <span className="staff-name">{staff.firstName} {staff.lastName}</span>
                                </td>
                                <td className="team-cell">
                                  <select
                                    value={staffData.assistantTeam || ''}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="task-select"
                                    disabled
                                    style={{
                                      backgroundColor: teams.find(t => t.value === staffData.assistantTeam)?.color || 'white'
                                    }}
                                  >
                                    <option value="">เลือกทีม</option>
                                    {teams.map(team => (
                                      <option key={team.value} value={team.value}>{team.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="ert-cell">
                                  <select
                                    value={staffData.assistantErt || ''}
                                    onChange={() => {}} // ไม่ทำอะไร
                                    className="task-select"
                                    disabled
                                  >
                                    <option value="">เลือก ERT</option>
                                    {ertRoles.map(role => (
                                      <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Popup */}
        <CustomPopup
          message={popup.message}
          type={popup.type}
          isVisible={popup.show}
          onClose={closePopup}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2>📋 จัดตารางมอบหมายงาน</h2>
      <p>ระบบจัดการมอบหมายงานให้เจ้าหน้าที่ในแต่ละเวรและเตียง</p>

      {/* แถบควบคุม */}
      <div className="task-controls">
        <div className="date-navigation">
          <div className="date-selector">
            <label htmlFor="day-select" className="selector-label">วัน:</label>
            <select 
              id="day-select"
              value={currentDate.getDate()} 
              onChange={handleDayChange}
              className="date-dropdown day-dropdown"
            >
              {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          
          <div className="month-selector">
            <label htmlFor="month-select" className="selector-label">เดือน:</label>
            <select 
              id="month-select"
              value={currentDate.getMonth()} 
              onChange={handleMonthChange}
              className="date-dropdown month-dropdown"
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
              value={currentDate.getFullYear()} 
              onChange={handleYearChange}
              className="date-dropdown year-dropdown"
            >
              {Array.from({ length: 21 }, (_, i) => {
                const year = currentDate.getFullYear() - 10 + i;
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
          <button onClick={loadScheduleData} className="btn btn-info">📥 ดึงข้อมูล</button>
          <button onClick={saveTaskData} className="btn btn-primary">💾 บันทึก</button>
          <button onClick={resetTable} className="btn btn-warning">🔄 รีเซ็ต</button>
          <button onClick={exportToExcel} className="btn btn-success">📊 ส่งออก Excel</button>
        </div>
      </div>

             {/* ตารางการมอบหมายงาน */}
       <div className="task-tables">
         {/* แต่ละเวรแสดงกล่องที่มีพยาบาลซ้าย ผู้ช่วยขวา */}
         {shifts.map(shift => (
           <div key={shift.id} className="task-table-section">
             <h3 className="table-title">
               {shift.icon} {shift.name}
             </h3>
             <div className="shift-container" data-shift={shift.id}>
               {/* กล่องพยาบาล */}
               <div className="nurse-box">
                 <h4 className="box-title">พยาบาล</h4>
                 <div className="task-table-container">
                   <table className="task-table nurse-table">
                     <thead>
                       <tr>
                         <th className="bed-header">เตียง</th>
                         <th className="staff-header">ชื่อเจ้าหน้าที่</th>
                         <th className="duty-header">หน้าที่</th>
                         <th className="drug-header">ดูแลยาเสพติด</th>
                         <th className="ert-header">ERT</th>
                       </tr>
                     </thead>
                     <tbody>
                       {(() => {
                         const staffOnShift = getStaffOnShift(shift.id);
                         const nurseStaff = staffOnShift.nurses;
                         
                         // ถ้าไม่มีคนในเวร ให้แสดงแถวเดียว
                         if (nurseStaff.length === 0) {
                           return (
                             <tr key={`${shift.id}-no-staff`} style={{ backgroundColor: shift.color }}>
                               <td colSpan="5" className="no-staff-message">
                                 ไม่มีเจ้าหน้าที่ทำงานในวันนี้
                               </td>
                             </tr>
                           );
                         }
                         
                         // สร้างแถวตามจำนวนคนในเวร
                         return nurseStaff.map((staff, index) => {
                           const staffData = taskData[shift.id]?.staffRow?.[staff.id] || {};
                           console.log(`👤 ข้อมูลเจ้าหน้าที่ ${staff.firstName} ${staff.lastName}:`, staffData);
                           
                           return (
                             <tr key={`${shift.id}-${staff.id}`} style={{ backgroundColor: shift.color }}>
                               <td className="bed-cell">
                                 <select
                                   value={staffData.assignedBed || ''}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'assignedBed', e.target.value)}
                                   className="task-select"
                                 >
                                   <option value="">เลือกเตียง</option>
                                   {bedStations.map(bedOption => (
                                     <option key={bedOption.id} value={bedOption.id}>
                                       {bedOption.name}
                                     </option>
                                   ))}
                                 </select>
                               </td>
                               <td className="staff-cell">
                                 <span className="staff-name">{staff.firstName} {staff.lastName}</span>
                               </td>
                               <td className="duty-cell">
                                 <select
                                   value={staffData.nurseDuty || ''}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'nurseDuty', e.target.value)}
                                   className="task-select"
                                   style={{
                                     backgroundColor: duties.find(d => d.value === staffData.nurseDuty)?.color || 'white'
                                   }}
                                 >
                                   <option value="">เลือกหน้าที่</option>
                                   {duties.map(duty => (
                                     <option key={duty.value} value={duty.value}>{duty.label}</option>
                                   ))}
                                 </select>
                               </td>
                               <td className="drug-cell">
                                 <input
                                   type="checkbox"
                                   checked={staffData.nurseDrugControl || false}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'nurseDrugControl', e.target.checked)}
                                   className="drug-checkbox"
                                 />
                               </td>
                               <td className="ert-cell">
                                 <select
                                   value={staffData.nurseErt || ''}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'nurseErt', e.target.value)}
                                   className="task-select"
                                 >
                                   <option value="">เลือก ERT</option>
                                   {ertRoles.map(role => (
                                     <option key={role.value} value={role.value}>{role.label}</option>
                                   ))}
                                 </select>
                               </td>
                             </tr>
                           );
                         });
                       })()}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* กล่องผู้ช่วย */}
               <div className="assistant-box">
                 <h4 className="box-title">กลุ่มผู้ช่วย</h4>
                 <div className="task-table-container">
                   <table className="task-table assistant-table">
                     <thead>
                       <tr>
                         <th className="staff-header">ชื่อเจ้าหน้าที่</th>
                         <th className="team-header">Team</th>
                         <th className="ert-header">ERT</th>
                       </tr>
                     </thead>
                     <tbody>
                       {(() => {
                         const staffOnShift = getStaffOnShift(shift.id);
                         const assistantStaff = staffOnShift.assistants;
                         
                         // ถ้าไม่มีคนในเวร ให้แสดงแถวเดียว
                         if (assistantStaff.length === 0) {
                           return (
                             <tr key={`${shift.id}-no-assistant`} style={{ backgroundColor: shift.color }}>
                               <td colSpan="3" className="no-staff-message">
                                 ไม่มีเจ้าหน้าที่ทำงานในวันนี้
                               </td>
                             </tr>
                           );
                         }
                         
                         // สร้างแถวตามจำนวนคนในเวร
                         return assistantStaff.map((staff, index) => {
                           const staffData = taskData[shift.id]?.assistantRow?.[staff.id] || {};
                           console.log(`👥 ข้อมูลผู้ช่วย ${staff.firstName} ${staff.lastName}:`, staffData);
                           
                           return (
                             <tr key={`${shift.id}-assistant-${staff.id}`} style={{ backgroundColor: shift.color }}>
                               <td className="staff-cell">
                                 <span className="staff-name">{staff.firstName} {staff.lastName}</span>
                               </td>
                               <td className="team-cell">
                                 <select
                                   value={staffData.assistantTeam || ''}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'assistantTeam', e.target.value, true)}
                                   className="task-select"
                                   style={{
                                     backgroundColor: teams.find(t => t.value === staffData.assistantTeam)?.color || 'white'
                                   }}
                                 >
                                   <option value="">เลือกทีม</option>
                                   {teams.map(team => (
                                     <option key={team.value} value={team.value}>{team.label}</option>
                                   ))}
                                 </select>
                               </td>
                               <td className="ert-cell">
                                 <select
                                   value={staffData.assistantErt || ''}
                                   onChange={(e) => updateSimpleTaskData(shift.id, staff.id, 'assistantErt', e.target.value, true)}
                                   className="task-select"
                                 >
                                   <option value="">เลือก ERT</option>
                                   {ertRoles.map(role => (
                                     <option key={role.value} value={role.value}>{role.label}</option>
                                   ))}
                                 </select>
                               </td>
                             </tr>
                           );
                         });
                       })()}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>

      {/* Custom Popup */}
      <CustomPopup
        message={popup.message}
        type={popup.type}
        isVisible={popup.show}
        onClose={closePopup}
      />
    </div>
  );
}

export default TaskAssignment;
