import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ScheduleManagement.css';

function ScheduleManagement({ user }) {
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
  const [showFullTable, setShowFullTable] = useState(false); // เพิ่ม state สำหรับแสดงตารางเต็ม

  // State สำหรับระบบบันทึกร่าง
  const [draftData, setDraftData] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);

  // State สำหรับการจัดรูปแบบข้อความ
  const [textFormat, setTextFormat] = useState({
    color: '#000000',
    fontSize: '14'
  });

  // State สำหรับการเลือกเจ้าหน้าที่จัด OT
  const [showStaffSelectionModal, setShowStaffSelectionModal] = useState(false);
  const [selectedStaffForOT, setSelectedStaffForOT] = useState([]);
  const [otDistributionMode, setOtDistributionMode] = useState('all'); // 'all' หรือ 'selected'

  // State สำหรับประวัติการกระทำ (Undo แบบง่าย)
  const [lastAction, setLastAction] = useState(null);

  // โหลดรายชื่อเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
  }, []);

  // โหลดข้อมูลตารางเวรเมื่อเปลี่ยนเดือน
  useEffect(() => {
    if (staffList.length > 0) {
          // console.log('🔍 ScheduleManagement - StaffList loaded:', staffList.length, 'staff');
    // console.log('🔍 ScheduleManagement - User object:', user);
    // console.log('🔍 ScheduleManagement - User canEditSchedule:', user?.canEditSchedule);
    // console.log('🔍 ScheduleManagement - User role:', user?.role);
    // console.log('🔍 ScheduleManagement - User firstName:', user?.firstName);
    // console.log('🔍 ScheduleManagement - User lastName:', user?.lastName);
    // console.log('🔍 ScheduleManagement - User position:', user?.position);
      
      // Debug: แสดงข้อมูลพาร์ททาร์มใน staffList
      const partTimeStaff = staffList.filter(staff => staff.position === 'Part time');
              // console.log('🔍 ScheduleManagement - Part time staff found:', partTimeStaff);
      
      loadSchedule();
    }
  }, [staffList, currentMonth, currentYear]);

  // Debug: แสดงข้อมูล scheduleData เมื่อเปลี่ยน
  useEffect(() => {
    // console.log('🔍 ScheduleManagement - scheduleData changed:', scheduleData);
    // console.log('🔍 ScheduleManagement - scheduleData keys:', Object.keys(scheduleData));
  }, [scheduleData]);

  // โหลดวันหยุดราชการเมื่อเปลี่ยนเดือน
  useEffect(() => {
    loadHolidays();
  }, [currentMonth, currentYear]);

  // โหลดวันหยุดจากฐานข้อมูลเมื่อเปลี่ยนเดือน
  useEffect(() => {
    loadHolidaysFromDB();
  }, [currentMonth, currentYear]);

  // ดึงข้อมูลวันหยุดราชการจาก API
  const loadHolidays = async () => {
    setHolidayLoading(true);
    try {
      // โหลดจากฐานข้อมูลก่อน
      const dbHolidays = await loadHolidaysFromDB();
      
      // ถ้าไม่มีข้อมูลในฐานข้อมูล ให้ใช้ข้อมูลตัวอย่าง
      if (!dbHolidays || dbHolidays.length === 0) {
        const month = currentMonth + 1;
        const year = currentYear;
        const sampleHolidays = getSampleThaiHolidays(year, month);
        setHolidays(sampleHolidays);
      } else {
        setHolidays(dbHolidays);
      }
    } catch (error) {
      console.error('❌ Error loading holidays:', error);
      // ใช้ข้อมูลตัวอย่างเมื่อเกิดข้อผิดพลาด
      const month = currentMonth + 1;
      const year = currentYear;
      const sampleHolidays = getSampleThaiHolidays(year, month);
      setHolidays(sampleHolidays);
    } finally {
      setHolidayLoading(false);
    }
  };

  // ข้อมูลตัวอย่างวันหยุดราชการไทย
  const getSampleThaiHolidays = (year, month) => {
    const holidays = [];
    
    // วันหยุดประจำปี
    if (month === 1) { // มกราคม
      holidays.push({
        id: `${year}-01-01`,
        date: `${year}-01-01`,
        name: 'วันขึ้นปีใหม่',
        type: 'ราชการ'
      });
    }
    
    if (month === 4) { // เมษายน
      holidays.push({
        id: `${year}-04-13`,
        date: `${year}-04-13`,
        name: 'วันสงกรานต์',
        type: 'ราชการ'
      });
      holidays.push({
        id: `${year}-04-14`,
        date: `${year}-04-14`,
        name: 'วันสงกรานต์',
        type: 'ราชการ'
      });
      holidays.push({
        id: `${year}-04-15`,
        date: `${year}-04-15`,
        name: 'วันสงกรานต์',
        type: 'ราชการ'
      });
    }
    
    if (month === 5) { // พฤษภาคม
      holidays.push({
        id: `${year}-05-01`,
        date: `${year}-05-01`,
        name: 'วันแรงงานแห่งชาติ',
        type: 'ราชการ'
      });
    }
    
    if (month === 7) { // กรกฎาคม
      holidays.push({
        id: `${year}-07-28`,
        date: `${year}-07-28`,
        name: 'วันเฉลิมพระชนมพรรษา',
        type: 'ราชการ'
      });
    }
    
    if (month === 8) { // สิงหาคม
      holidays.push({
        id: `${year}-08-12`,
        date: `${year}-08-12`,
        name: 'วันแม่แห่งชาติ',
        type: 'ราชการ'
      });
    }
    
    if (month === 10) { // ตุลาคม
      holidays.push({
        id: `${year}-10-23`,
        date: `${year}-10-23`,
        name: 'วันปิยมหาราช',
        type: 'ราชการ'
      });
    }
    
    if (month === 12) { // ธันวาคม
      holidays.push({
        id: `${year}-12-05`,
        date: `${year}-12-05`,
        name: 'วันพ่อแห่งชาติ',
        type: 'ราชการ'
      });
      holidays.push({
        id: `${year}-12-10`,
        date: `${year}-12-10`,
        name: 'วันรัฐธรรมนูญ',
        type: 'ราชการ'
      });
      holidays.push({
        id: `${year}-12-31`,
        date: `${year}-12-31`,
        name: 'วันสิ้นปี',
        type: 'ราชการ'
      });
    }
    
    return holidays;
  };

  // เพิ่มวันหยุดใหม่
  const addHoliday = async () => {
    if (newHoliday.date && newHoliday.name) {
      const holiday = {
        id: `custom_${Date.now()}`,
        date: newHoliday.date,
        name: newHoliday.name,
        type: 'เพิ่มเติม'
      };

      
      const newHolidays = [...holidays, holiday];
      setHolidays(newHolidays);
      
      // บันทึกลง Firebase ทันที
      try {
        await saveHolidaysToFirebase(newHolidays);
  
      } catch (error) {
        console.error('Error saving new holiday to Firebase:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกวันหยุดใหม่');
      }
      
      setNewHoliday({ date: '', name: '' });
      setShowAddHoliday(false);
    }
  };

  // บันทึกวันหยุดลงฐานข้อมูล
  const saveHolidays = async () => {
    try {
      await saveHolidaysToFirebase(holidays);

      alert('บันทึกวันหยุดเรียบร้อยแล้ว');
    } catch (error) {
      console.error('❌ Error saving holidays:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกวันหยุด');
    }
  };

  // ฟังก์ชันบันทึกวันหยุดลง Firebase
  const saveHolidaysToFirebase = async (holidaysToSave) => {
    const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;

    
    await setDoc(doc(db, 'holidays', holidaysId), {
      month: currentMonth + 1,
      year: currentYear,
      holidays: holidaysToSave,
      updatedAt: new Date().toISOString()
    });
    

  };

  // โหลดวันหยุดจากฐานข้อมูล
  const loadHolidaysFromDB = async () => {
    try {
      const holidaysId = `holidays_${currentYear}_${currentMonth + 1}`;

      const holidaysDoc = await getDoc(doc(db, 'holidays', holidaysId));
      
      if (holidaysDoc.exists()) {
        const dbHolidays = holidaysDoc.data().holidays || [];

        return dbHolidays;
      } else {

        return [];
      }
    } catch (error) {
      console.error('Error loading holidays from DB:', error);
      return [];
    }
  };

  // ลบวันหยุด
  const removeHoliday = async (holidayId) => {

    
    const newHolidays = holidays.filter(h => h.id !== holidayId);
    setHolidays(newHolidays);
    
    // บันทึกลง Firebase ทันที
    try {
      await saveHolidaysToFirebase(newHolidays);

    } catch (error) {
      console.error('❌ Error saving holiday removal to Firebase:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกการลบวันหยุด');
    }
  };

  // ส่งออกตารางเวรเป็น Excel
  const exportToExcel = () => {
    // สร้างข้อมูลสำหรับ Excel
    const excelData = [];
    
    // เพิ่มหัวตาราง
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'ตำแหน่ง'];
    for (let day = 1; day <= daysInMonth; day++) {
      headers.push(`วันที่ ${day}`);
    }
    headers.push('เวรรวม', 'OT', 'ค่าเวร');
    excelData.push(headers);
    
          // เพิ่มข้อมูลเจ้าหน้าที่
      staffList.forEach((staff, index) => {
        // แถวที่ 1: ข้อมูลหลัก
        const row1 = [
          index + 1,
          `${staff.firstName} ${staff.lastName}`,
          staff.position
        ];
        
        // ข้อมูลเวรแต่ละวัน (แถวที่ 1)
        for (let day = 1; day <= daysInMonth; day++) {
          const mainShift = scheduleData[day]?.[staff.id] || '';
          const mainText = mainShift ? getCellFormat(mainShift).text : '';
          row1.push(mainText || '');
        }
        
        // คอลัมน์สรุป
        const otNeeded = calculateOTNeeded(staff.id);
        const totalShiftsText = otNeeded > 0 ? `${calculateTotalShifts(staff.id)} (ต้องการ OT: ${otNeeded})` : calculateTotalShifts(staff.id);
        
        row1.push(
          totalShiftsText,
          calculateOTShifts(staff.id),
          calculateSalaryShifts(staff.id)
        );
        
        excelData.push(row1);
        
        // แถวที่ 2: ข้อมูลเพิ่มเติม
        const row2 = [
          '', // ไม่มีลำดับ
          '', // ไม่มีชื่อ
          ''  // ไม่มีตำแหน่ง
        ];
        
        // ข้อมูลเวรแต่ละวัน (แถวที่ 2)
        for (let day = 1; day <= daysInMonth; day++) {
          const extraShift = scheduleData[day]?.[`${staff.id}_extra`] || '';
          const extraText = extraShift ? getCellFormat(extraShift).text : '';
          row2.push(extraText || '');
        }
        
        // คอลัมน์สรุป (แถวที่ 2)
        row2.push(
          otNeeded > 0 ? `ต้องการ OT: ${otNeeded}` : '',
          '',
          ''
        );
        
        excelData.push(row2);
      });
    
    // สร้างแถวสรุป
    const summaryRow = ['📊 สรุป', '', ''];
    for (let day = 1; day <= daysInMonth; day++) {
      const { morningCount, afternoonCount, nightCount } = calculateDailyStaffCount(day, 'all');
      summaryRow.push(`ช:${morningCount} บ:${afternoonCount} ด:${nightCount}`);
    }
    summaryRow.push('', '', '');
    excelData.push(summaryRow);
    
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
    link.setAttribute('download', `ตารางเวร_${getMonthName()}_${currentYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // พิมพ์ตารางเวร
  const printSchedule = () => {
    // สร้างหน้าต่างใหม่สำหรับพิมพ์
    const printWindow = window.open('', '_blank');
    
    // สร้าง HTML สำหรับพิมพ์
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ตารางเวร ${getMonthName()} ${currentYear}</title>
          <style>
            @media print {
              body { 
                font-family: 'Kanit', sans-serif; 
                margin: 0;
                padding: 0;
                background: white;
              }
              .print-header { 
                text-align: center; 
                margin-bottom: 30px;
                background: linear-gradient(135deg, #00A651 0%, #00B050 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 166, 81, 0.2);
              }
              .print-title { 
                font-size: 2.5rem; 
                font-weight: 600; 
                margin-bottom: 10px; 
              }
              .print-subtitle { 
                font-size: 1.1rem; 
                opacity: 0.9;
                margin-bottom: 5px;
              }
              .print-date { 
                font-size: 1rem; 
                opacity: 0.8;
              }
              .table-section {
                margin-bottom: 40px;
                page-break-inside: avoid;
              }
              .table-title {
                color: #2c3e50;
                font-size: 1.5rem;
                margin-bottom: 20px;
                padding: 15px 20px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 12px;
                border-left: 5px solid #00A651;
              }
              .schedule-table-container {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                overflow-x: auto;
                width: 100%;
                max-width: 100%;
                margin: 0;
                max-height: none;
                overflow-y: visible;
              }
              .schedule-table { 
                width: 100%;
                border-collapse: collapse;
                font-family: 'Kanit', sans-serif;
                table-layout: fixed;
                min-width: 100%;
              }
              .schedule-table th,
              .schedule-table td {
                border: 1px solid #e9ecef;
                padding: 6px;
                text-align: center;
                vertical-align: middle;
                word-wrap: break-word;
              }
              .schedule-table th {
                background: #f8f9fa;
                font-weight: 600;
                color: #2c3e50;
                position: sticky;
                top: 0;
                z-index: 10;
              }
              .order-col {
                width: 0.7cm;
                min-width: 0.7cm;
                max-width: 0.7cm;
                background: #e9ecef;
                position: sticky;
                left: 0;
                z-index: 5;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
              }
              .name-col {
                width: 3cm;
                min-width: 3cm;
                max-width: 3cm;
                background: #f8f9fa;
                position: sticky;
                left: 0.7cm;
                z-index: 5;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
              }
              .day-col {
                width: 0.7cm;
                min-width: 0.7cm;
                max-width: 0.7cm;
              }
              .total-col,
              .ot-col,
              .salary-col {
                width: 1cm;
                min-width: 1cm;
                max-width: 1cm;
                background: #f8f9fa;
                position: sticky;
                right: 0;
                z-index: 5;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
              }
              .weekend-col {
                background: #fff3cd !important;
              }
              .holiday-col {
                background: #f8d7da !important;
              }
              .weekend-cell {
                background: #fff3cd !important;
              }
              .holiday-cell {
                background: #f8d7da !important;
              }
              .day-header {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .day-number {
                font-size: 16px;
                font-weight: 600;
                color: #2c3e50;
              }
              .day-name {
                font-size: 12px;
                color: #6c757d;
              }
              .day-name.weekend {
                color: #856404;
                font-weight: 600;
              }
              .day-name.holiday {
                color: #721c24;
                font-weight: 600;
              }
              .order-cell {
                background: #e9ecef;
                font-weight: 600;
                color: #495057;
                position: sticky;
                left: 0;
                z-index: 5;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
              }
              .name-cell {
                background: #f8f9fa;
                text-align: left;
                padding: 12px;
                position: sticky;
                left: 0.7cm;
                z-index: 5;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
              }
              .staff-name-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .staff-first-name {
                font-weight: 600;
                color: #2c3e50;
                font-size: 14px;
              }
              .staff-last-name {
                color: #495057;
                font-size: 13px;
              }
              .staff-position {
                font-size: 11px;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                display: inline-block;
                font-weight: 500;
                text-align: center;
                min-width: 60px;
              }
              .staff-position[data-position="พยาบาล"] {
                background: #667eea;
              }
              .staff-position[data-position="ผู้ช่วยพยาบาล"] {
                background: #f093fb;
              }
              .staff-position[data-position="ผู้ช่วยเหลือคนไข้"] {
                background: #4facfe;
              }
              .staff-position[data-position="Part time"] {
                background: #ff9a9e;
              }
              .schedule-cell {
                background: white;
                position: relative;
                min-height: 60px;
                transition: all 0.2s ease;
              }
              .schedule-cell.extra {
                background: #f8f9fa;
                min-height: 40px;
              }
              .cell-input {
                width: 100%;
                height: 100%;
                border: none;
                background: transparent;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
                color: #2c3e50;
                padding: 8px 4px;
                outline: none;
                transition: all 0.2s ease;
                border-radius: 4px;
              }
              .cell-input.extra {
                font-size: 12px;
                padding: 4px;
                color: #6c757d;
              }
              .summary-row {
                background: #e8f5e8;
                font-weight: 600;
              }
              .summary-label {
                text-align: left;
                color: #2c3e50;
                font-size: 14px;
                position: sticky;
                left: 0;
                z-index: 5;
                background: #e8f5e8;
              }
              .summary-cell {
                background: #f0f8f0;
                padding: 6px;
              }
              .shift-counts {
                display: flex;
                flex-direction: column;
                gap: 2px;
                font-size: 11px;
              }
              .shift-count {
                padding: 2px 4px;
                border-radius: 3px;
                font-weight: 500;
              }
              .shift-count.morning {
                background: #e3f2fd;
                color: #1976d2;
              }
              .shift-count.afternoon {
                background: #e8f5e8;
                color: #388e3c;
              }
              .shift-count.night {
                background: #fce4ec;
                color: #c2185b;
              }
              .page-break { 
                page-break-before: always; 
              }
              @page { 
                size: landscape; 
                margin: 1cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
                    <div class="print-title">🏥 SA HOS APP</div>
        <div class="print-subtitle">ระบบจัดตารางเวรและมอบหมายงาน</div>
            <div class="print-date">ตารางเวร ${getMonthName()} ${currentYear}</div>
            <div class="print-date">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</div>
          </div>
          
          ${generatePrintTables()}
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // รอให้โหลดเสร็จแล้วพิมพ์
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // สร้างตารางเวร
  const renderScheduleTable = (staffType, title, icon) => {
    const filteredStaff = staffList.filter(staff => {
      if (staffType === 'พยาบาล') {
        return staff.position === 'พยาบาล';
      } else {
        return ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position);
      }
    });

    if (filteredStaff.length === 0) return null;

    return (
      <div key={staffType} className="schedule-table-section">
        <h3 className="table-title">
          {icon} {title} ({filteredStaff.length} คน) - วันทำการ: {getWorkingDays()} วัน
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
                <th className="total-col">เวรรวม</th>
                <th className="ot-col">OT</th>
                <th className="salary-col">ค่าเวร</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff, index) => (
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
                          className={`schedule-cell ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''} ${
                            selectedCells.find(cell => cell.day === day && cell.staffId === staff.id) ? 'selected' : ''
                          }`}
                          onClick={(e) => handleCellClick(e, day, staff.id)}
                          data-day={day}
                          data-staff={staff.id}
                        >
                          <input
                            type="text"
                            value={getCellFormat(cellValue).text}
                            onChange={(e) => user?.canEditSchedule ? handleCellInput(day, staff.id, e.target.value) : null}
                            onKeyDown={(e) => user?.canEditSchedule ? handleKeyDown(e, day, staff.id) : null}
                            className="cell-input"
                            placeholder=""
                            disabled={!user?.canEditSchedule}
                            style={{
                              color: getCellFormat(cellValue).color,
                              fontSize: `${getCellFormat(cellValue).fontSize}px`,
                              backgroundColor: getCellFormat(cellValue).backgroundColor
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="total-cell" rowSpan="2">
                      <div className="total-shifts">
                        <div className="total-number">{calculateTotalShifts(staff.id)}</div>
                        <div className="ot-needed">
                          {(() => {
                            const otNeeded = calculateOTNeeded(staff.id);
                            return otNeeded > 0 ? `(ต้องการ OT: ${otNeeded})` : '';
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="ot-cell" rowSpan="2">{calculateOTShifts(staff.id)}</td>
                    <td className="salary-cell" rowSpan="2">{calculateSalaryShifts(staff.id)}</td>
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
                          className={`schedule-cell extra ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''} ${
                            selectedCells.find(cell => cell.day === day && cell.staffId === `${staff.id}_extra`) ? 'selected' : ''
                          }`}
                          onClick={(e) => handleCellClick(e, day, `${staff.id}_extra`)}
                          data-day={day}
                          data-staff={`${staff.id}_extra`}
                        >
                          <input
                            type="text"
                            value={getCellFormat(extraValue).text}
                            onChange={(e) => user?.canEditSchedule ? handleCellInput(day, `${staff.id}_extra`, e.target.value) : null}
                            onKeyDown={(e) => user?.canEditSchedule ? handleKeyDown(e, day, `${staff.id}_extra`) : null}
                            className="cell-input extra"
                            placeholder=""
                            disabled={!user?.canEditSchedule}
                            style={{
                              color: getCellFormat(extraValue).color,
                              fontSize: `${getCellFormat(extraValue).fontSize}px`,
                              backgroundColor: getCellFormat(extraValue).backgroundColor
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              ))}
              
              {/* แถวสรุป */}
              <tr className="summary-row">
                <td className="summary-label" colSpan="2">📊 สรุป {title}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(currentYear, currentMonth, day);
                  const dayOfWeek = date.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
                  const { morningCount, afternoonCount, nightCount } = calculateDailyStaffCount(day, staffType);
                  
                  return (
                    <td 
                      key={day} 
                      className={`summary-cell ${isWeekend ? 'weekend-cell' : ''} ${isHoliday ? 'holiday-cell' : ''}`}
                    >
                                              <div className="shift-counts">
                          <div className="shift-count morning">ช:{morningCount}</div>
                          <div className="shift-count afternoon">บ:{afternoonCount}</div>
                          <div className="shift-count night">ด:{nightCount}</div>
                        </div>
                    </td>
                  );
                })}
                <td className="summary-cell total">-</td>
                <td className="summary-cell ot">-</td>
                <td className="summary-cell salary">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const loadStaff = async () => {
    try {
      // console.log('🔍 loadStaff - Starting...');
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staff = [];
      querySnapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      
              // console.log('🔍 loadStaff - Found staff:', staff.length, 'people');
        // console.log('🔍 loadStaff - Staff data:', staff);
      
      // เรียงลำดับตาม order
      staff.sort((a, b) => (a.order || 0) - (b.order || 0));
      setStaffList(staff);
      
              // console.log('🔍 loadStaff - Staff list set successfully');
      
      // แสดงข้อมูลสิทธิ์ของเจ้าหน้าที่ทุกคน
              // console.log('🔍 StaffManagement - All staff data:');
      // staff.forEach((staffMember, index) => {
      //   console.log(`🔍 Staff ${index + 1}:`, {
      //     name: `${staffMember.firstName} ${staffMember.lastName}`,
      //     position: staffMember.position,
      //     canEditSchedule: staffMember.canEditSchedule,
      //     canAssignTasks: staffMember.canAssignTasks,
      //     department: staffMember.department
      //   });
      // });
      
      // Debug: แสดงข้อมูลพาร์ททาร์มเฉพาะ
      const partTimeStaff = staff.filter(staff => staff.position === 'Part time');
              // console.log('🔍 StaffManagement - Part time staff found:', partTimeStaff);
      
      if (partTimeStaff.length === 0) {
                  // console.log('🔍 StaffManagement - No part time staff found in database');
      } else {
        // partTimeStaff.forEach((ptStaff, index) => {
        //   // console.log(`🔍 Part time staff ${index + 1}:`, {
        //     name: `${ptStaff.firstName} ${ptStaff.lastName}`,
        //     canEditSchedule: ptStaff.canEditSchedule,
        //     canAssignTasks: ptStaff.canAssignTasks
        //   });
        // });
      }
      
      loadSchedule();
    } catch (error) {
      console.error('❌ Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
          // console.log('🔍 loadSchedule - Starting...');
    // console.log('🔍 loadSchedule - Current month/year:', currentMonth + 1, currentYear);
    // console.log('🔍 loadSchedule - User canEditSchedule:', user?.canEditSchedule);
      
      const scheduleId = `schedule_${currentYear}_${currentMonth + 1}`;
              // console.log('🔍 loadSchedule - Schedule ID:', scheduleId);
      
      const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId));
      
      if (scheduleDoc.exists()) {
        const scheduleData = scheduleDoc.data();
                  // console.log('🔍 loadSchedule - Found schedule data:', scheduleData);
          // console.log('🔍 loadSchedule - Schedule status:', scheduleData.status);
        
        // ทุกคนเห็นข้อมูลเวรที่มีอยู่ (ไม่ว่าจะมีสิทธิ์อะไร)
        if (scheduleData.shifts && Object.keys(scheduleData.shifts).length > 0) {
                      // console.log('🔍 loadSchedule - Loading existing schedule data for all users');
            // console.log('🔍 loadSchedule - Schedule data:', scheduleData.shifts);
            // console.log('🔍 loadSchedule - User position:', user?.position);
            // console.log('🔍 loadSchedule - User canEditSchedule:', user?.canEditSchedule);
          setScheduleData(scheduleData.shifts);
        } else {
          // ถ้าไม่มีข้อมูลเวร ให้สร้างตารางเปล่า
          // console.log('🔍 loadSchedule - No schedule data found, creating empty table');
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
      } else {
        // console.log('🔍 loadSchedule - No schedule found, creating empty');
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
      console.error('❌ Error loading schedule:', error);
    }
  };



  // บันทึกตารางเวร
  const saveSchedule = async () => {
    try {
      const scheduleId = `schedule_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'schedules', scheduleId), {
        month: currentMonth + 1,
        year: currentYear,
        shifts: scheduleData,
        updatedAt: new Date().toISOString(),
        status: 'published' // สถานะตารางเวรที่เผยแพร่แล้ว
      });
      alert('บันทึกตารางเวรเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // บันทึกร่างตารางเวร
  const saveDraft = async () => {
    try {
      const draftId = `draft_${currentYear}_${currentMonth + 1}`;
      await setDoc(doc(db, 'scheduleDrafts', draftId), {
        month: currentMonth + 1,
        year: currentYear,
        shifts: scheduleData,
        updatedAt: new Date().toISOString(),
        status: 'draft' // สถานะร่าง
      });
      
      // เก็บข้อมูลร่างใน state
      setDraftData(scheduleData);
      setHasDraft(true);
      setIsDraftMode(true);
      
      alert('บันทึกร่างเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกร่าง');
    }
  };

  // โหลดร่างตารางเวร
  const loadDraft = async () => {
    try {
      const draftId = `draft_${currentYear}_${currentMonth + 1}`;
      const draftDoc = await getDoc(doc(db, 'scheduleDrafts', draftId));
      
      if (draftDoc.exists()) {
        const draftData = draftDoc.data();
        setScheduleData(draftData.shifts || {});
        setDraftData(draftData.shifts || {});
        setHasDraft(true);
        setIsDraftMode(true);
        alert('โหลดร่างเรียบร้อยแล้ว');
      } else {
        alert('ไม่มีร่างตารางเวรสำหรับเดือนนี้');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('เกิดข้อผิดพลาดในการโหลดร่าง');
    }
  };

  // ลบร่างตารางเวร
  const deleteDraft = async () => {
    if (window.confirm('คุณต้องการลบร่างตารางเวรหรือไม่?')) {
      try {
        const draftId = `draft_${currentYear}_${currentMonth + 1}`;
        await setDoc(doc(db, 'scheduleDrafts', draftId), {
          month: currentMonth + 1,
          year: currentYear,
          shifts: {},
          updatedAt: new Date().toISOString(),
          status: 'deleted'
        });
        
        setDraftData({});
        setHasDraft(false);
        setIsDraftMode(false);
        
        alert('ลบร่างเรียบร้อยแล้ว');
      } catch (error) {
        console.error('Error deleting draft:', error);
        alert('เกิดข้อผิดพลาดในการลบร่าง');
      }
    }
  };

  // ตรวจสอบว่ามีร่างหรือไม่
  const checkDraft = async () => {
    try {
      const draftId = `draft_${currentYear}_${currentMonth + 1}`;
      const draftDoc = await getDoc(doc(db, 'scheduleDrafts', draftId));
      
      if (draftDoc.exists()) {
        const draftData = draftDoc.data();
        if (draftData.status === 'draft') {
          setHasDraft(true);
          setDraftData(draftData.shifts || {});
        }
      }
    } catch (error) {
      console.error('Error checking draft:', error);
    }
  };

  // รีเซ็ตตาราง
  const resetSchedule = () => {
    if (window.confirm('คุณต้องการรีเซ็ตตารางเวรทั้งหมดหรือไม่?')) {
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
  };

  // ตรวจสอบร่างเมื่อเปลี่ยนเดือนหรือปี
  useEffect(() => {
    if (user?.canEditSchedule) {
      checkDraft();
    }
  }, [currentMonth, currentYear, user?.canEditSchedule]);

  // จัดการการพิมพ์ในช่อง
  const handleCellInput = (day, staffId, value) => {
    setScheduleData(prev => {
      // ใช้ auto-formatting สำหรับข้อความที่พิมพ์
      const formattedValue = autoFormatText(value);
      
      return {
      ...prev,
      [day]: {
        ...prev[day],
          [staffId]: JSON.stringify(formattedValue)
        }
      };
    });
  };

  // ฟังก์ชันจัดการการจัดรูปแบบข้อความ
  const applyTextFormat = (property, value) => {
    setTextFormat(prev => ({
      ...prev,
      [property]: value
    }));

    // ถ้ามีช่องที่เลือกอยู่ ให้ปรับรูปแบบทันที
    if (selectedCells.length > 0) {
      setScheduleData(prev => {
        const newData = { ...prev };
        selectedCells.forEach(cell => {
          if (newData[cell.day] && newData[cell.day][cell.staffId] !== undefined) {
            // เก็บข้อมูลการจัดรูปแบบในรูปแบบ JSON string
            const currentValue = newData[cell.day][cell.staffId];
            let formattedValue;
            
            if (typeof currentValue === 'string' && currentValue.startsWith('{')) {
              try {
                formattedValue = JSON.parse(currentValue);
              } catch {
                formattedValue = { text: currentValue, color: '#000000', fontSize: '14' };
              }
            } else {
              formattedValue = { text: currentValue || '', color: '#000000', fontSize: '14' };
            }
            
            formattedValue[property] = value;
            newData[cell.day][cell.staffId] = JSON.stringify(formattedValue);
          }
        });
        return newData;
      });
    }
  };

  // ฟังก์ชันดึงข้อมูลการจัดรูปแบบจากค่าในช่อง
  const getCellFormat = (value) => {
    if (typeof value === 'string' && value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        return {
          text: parsed.text || '',
          color: parsed.color || '#000000',
          fontSize: parsed.fontSize || '14',
          backgroundColor: parsed.backgroundColor || 'transparent'
        };
      } catch {
        return { text: value, color: '#000000', fontSize: '14', backgroundColor: 'transparent' };
      }
    }
    return { text: value, color: '#000000', fontSize: '14', backgroundColor: 'transparent' };
  };

  // ฟังก์ชัน auto-formatting ตาม logic ที่กำหนด
  const autoFormatText = (text) => {
    const upperText = text.toUpperCase();
    const lowerText = text.toLowerCase();
    
    // Logic สำหรับ O (ตัวพิมพ์ใหญ่หรือเล็ก)
    if (upperText === 'O') {
      return {
        text: 'O',
        color: '#FF0000',
        fontSize: textFormat.fontSize,
        backgroundColor: 'transparent'
      };
    }
    
    // Logic สำหรับ VA (ตัวพิมพ์เล็กหรือใหญ่)
    if (upperText === 'VA') {
      return {
        text: upperText,
        color: '#000000',
        fontSize: textFormat.fontSize,
        backgroundColor: '#FF0000'
      };
    }
    
    // Logic สำหรับ ช, บ, ด
    if (['ช', 'บ', 'ด'].includes(text)) {
      return {
        text: text,
        color: '#000000',
        fontSize: textFormat.fontSize,
        backgroundColor: 'transparent'
      };
    }
    
    // Logic สำหรับ ช* (ชตามด้วย *)
    if (text.startsWith('ช') && text.includes('*')) {
      return {
        text: text,
        color: '#0066CC',
        fontSize: textFormat.fontSize,
        backgroundColor: 'transparent'
      };
    }
    
    // Logic สำหรับ MB
    if (upperText === 'MB') {
      return {
        text: upperText,
        color: '#000000',
        fontSize: textFormat.fontSize,
        backgroundColor: '#90EE90'
      };
    }
    
    // Logic สำหรับข้อความอื่นๆ (CSSD, อาชีวะ, etc.)
    if (text.length > 0 && !['O', 'VA', 'ช', 'บ', 'ด', 'MB'].includes(text) && !text.startsWith('ช*')) {
      return {
        text: text,
        color: '#000000',
        fontSize: textFormat.fontSize,
        backgroundColor: '#FFFF00'
      };
    }
    
    // ค่าเริ่มต้น
    return {
      text: text,
      color: textFormat.color,
      fontSize: textFormat.fontSize,
      backgroundColor: 'transparent'
    };
  };

  // คลิกช่องเพื่อเลือก
  const handleCellClick = (e, day, staffId) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+คลิก เพื่อเลือกหลายช่อง
      setSelectedCells(prev => {
        if (prev.find(cell => cell.day === day && cell.staffId === staffId)) {
          // ถ้าช่องนี้ถูกเลือกอยู่แล้ว ให้ลบออก
          return prev.filter(cell => !(cell.day === day && cell.staffId === staffId));
        } else {
          // เพิ่มช่องใหม่เข้าไป
          return [...prev, { day, staffId }];
        }
      });
      setSelectedCell({ day, staffId });
    } else {
      // คลิกปกติ เลือกช่องเดียว
      setSelectedCells([{ day, staffId }]);
      setSelectedCell({ day, staffId });
    }
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



  // หาจำนวนวันในเดือน
  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  // ชื่อเดือนภาษาไทย
  const getMonthName = () => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[currentMonth];
  };

  // ชื่อเดือนภาษาไทยตาม index (สำหรับ dropdown)
  const getMonthNameByIndex = (index) => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[index];
  };

  // คำนวณจำนวนคนขึ้นเวรในแต่ละวัน (แยกตามประเภท)
  const calculateDailyStaffCount = (day, staffType = 'all') => {
    const dayData = scheduleData[day] || {};
    let morningCount = 0;
    let afternoonCount = 0;
    let nightCount = 0;

    // ตรวจสอบว่ามี ช ของประนอมหรือศิรินทราหรือไม่ (ทั้งแถวที่ 1 และ 2)
    let hasSpecialMorning = false;
    let specialMorningStaff = [];
    
    // รอบแรก: ตรวจสอบ special cases (ทั้งแถวที่ 1 และ 2)
    Object.entries(dayData).forEach(([staffId, value]) => {
      const staff = staffList.find(s => s.id === staffId.replace('_extra', ''));
      if (staff && (staffType === 'all' || 
          (staffType === 'พยาบาล' && staff.position === 'พยาบาล') ||
          (staffType === 'ผู้ช่วย' && ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position)))) {
        const formattedValue = getCellFormat(value);
        const text = formattedValue.text;
        
        // ตรวจสอบว่ามี ช ของประนอมหรือศิรินทรา (ทั้งแถวที่ 1 และ 2)
        if ((staff.firstName === 'ประนอม' || staff.firstName === 'ศิรินทรา') && text === 'ช') {
          hasSpecialMorning = true;
          specialMorningStaff.push(`${staff.firstName} (${staffId.includes('_extra') ? 'แถวที่ 2' : 'แถวที่ 1'})`);

        }
      }
    });
    

    
    // รอบที่สอง: นับจำนวนคนขึ้นเวร (ทั้งแถวที่ 1 และ 2)
    Object.entries(dayData).forEach(([staffId, value]) => {
      const staff = staffList.find(s => s.id === staffId.replace('_extra', ''));
      if (staff && (staffType === 'all' || 
          (staffType === 'พยาบาล' && staff.position === 'พยาบาล') ||
          (staffType === 'ผู้ช่วย' && ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position)))) {
        const formattedValue = getCellFormat(value);
        const text = formattedValue.text;
        
        // Logic พิเศษสำหรับประนอมและศิรินทรา (ทั้งแถวที่ 1 และ 2)
        if (staff.firstName === 'ประนอม' || staff.firstName === 'ศิรินทรา') {
          // ประนอม: ช ไม่นับรวม (ทั้งแถวที่ 1 และ 2)
          if (staff.firstName === 'ประนอม' && text === 'ช') {
            // ไม่นับรวม
          }
          // ศิรินทรา: ช ไม่นับรวม, แต่ ช* นับรวม (ทั้งแถวที่ 1 และ 2)
          else if (staff.firstName === 'ศิรินทรา') {
            if (text === 'ช') {
              // ไม่นับรวม
            } else if (text === 'ช*') {
              morningCount++; // นับรวม!
            } else if (text === 'บ') {
              afternoonCount++;
            } else if (text === 'ด') {
              nightCount++;
            }
          }
        } else {
          // คนอื่นๆ นับปกติ (ทั้งแถวที่ 1 และ 2)
          if (text === 'ช') {
            morningCount++;
          }
          if (text === 'บ') {
            afternoonCount++;
          }
          if (text === 'ด') {
            nightCount++;
          }
        }
      }
    });


    return { morningCount, afternoonCount, nightCount };
  };

  // ฟังก์ชันคำนวณเวรรวมสำหรับแต่ละคน
  const calculateTotalShifts = (staffId) => {
    let totalShifts = 0;
    
    // วนลูปทุกวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = scheduleData[day] || {};
      
      // ตรวจสอบแถวที่ 1 (เวรหลัก)
      const mainShift = dayData[staffId];
      if (mainShift) {
        const formattedValue = getCellFormat(mainShift);
        const text = formattedValue.text;
        
        // นับเวรทั้งหมด ยกเว้น O และช่องว่าง
        if (text && text !== 'O' && text.trim() !== '') {
          totalShifts++;
        }
      }
      
      // ตรวจสอบแถวที่ 2 (เวรเพิ่มเติม)
      const extraShift = dayData[`${staffId}_extra`];
      if (extraShift) {
        const formattedValue = getCellFormat(extraShift);
        const text = formattedValue.text;
        
        // นับเวรทั้งหมด ยกเว้น O และช่องว่าง
        if (text && text !== 'O' && text.trim() !== '') {
          totalShifts++;
        }
      }
    }
    
    return totalShifts;
  };

  // ฟังก์ชันคำนวณ OT สำหรับแต่ละคน (เวรช/บ/ด ที่เป็นสีแดง และ MB ที่มีพื้นหลังสีเขียวและตัวอักษรสีแดง)
  const calculateOTShifts = (staffId) => {
    let otShifts = 0;
    
    // วนลูปทุกวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = scheduleData[day] || {};
      
      // ตรวจสอบแถวที่ 1 (เวรหลัก)
      const mainShift = dayData[staffId];
      if (mainShift) {
        const formattedValue = getCellFormat(mainShift);
        const text = formattedValue.text;
        const color = formattedValue.color;
        const backgroundColor = formattedValue.backgroundColor;
        
        // นับเวรช/บ/ด ที่เป็นสีแดง
        if ((text === 'ช' || text === 'บ' || text === 'ด') && color === '#FF0000') {
          otShifts++;
        }
        
        // นับ MB ที่มีพื้นหลังสีเขียวและตัวอักษรสีแดง (OT)
        if (text === 'MB' && backgroundColor === '#90EE90' && color === '#FF0000') {
          otShifts++;
        }
      }
      
      // ตรวจสอบแถวที่ 2 (เวรเพิ่มเติม)
      const extraShift = dayData[`${staffId}_extra`];
      if (extraShift) {
        const formattedValue = getCellFormat(extraShift);
        const text = formattedValue.text;
        const color = formattedValue.color;
        const backgroundColor = formattedValue.backgroundColor;
        
        // นับเวรช/บ/ด ที่เป็นสีแดง
        if ((text === 'ช' || text === 'บ' || text === 'ด') && color === '#FF0000') {
          otShifts++;
        }
        
        // นับ MB ที่มีพื้นหลังสีเขียวและตัวอักษรสีแดง (OT)
        if (text === 'MB' && backgroundColor === '#90EE90' && color === '#FF0000') {
          otShifts++;
        }
      }
    }
    
    return otShifts;
  };

  // ฟังก์ชันคำนวณค่าเวรสำหรับแต่ละคน (เวรบ/ด ที่เป็นสีดำ)
  const calculateSalaryShifts = (staffId) => {
    let salaryShifts = 0;
    
    // วนลูปทุกวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = scheduleData[day] || {};
      
      // ตรวจสอบแถวที่ 1 (เวรหลัก)
      const mainShift = dayData[staffId];
      if (mainShift) {
        const formattedValue = getCellFormat(mainShift);
        const text = formattedValue.text;
        const color = formattedValue.color;
        
        // นับเวรบ/ด ที่เป็นสีดำ
        if ((text === 'บ' || text === 'ด') && color === '#000000') {
          salaryShifts++;
        }
      }
      
      // ตรวจสอบแถวที่ 2 (เวรเพิ่มเติม)
      const extraShift = dayData[`${staffId}_extra`];
      if (extraShift) {
        const formattedValue = getCellFormat(extraShift);
        const text = formattedValue.text;
        const color = formattedValue.color;
        
        // นับเวรบ/ด ที่เป็นสีดำ
        if ((text === 'บ' || text === 'ด') && color === '#000000') {
          salaryShifts++;
        }
      }
    }
    
    return salaryShifts;
  };

  // ฟังก์ชันคำนวณจำนวนวันทำการในเดือน
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

  // ฟังก์ชันคำนวณจำนวน OT ที่ต้องการสำหรับแต่ละคน
  const calculateOTNeeded = (staffId) => {
    const totalShifts = calculateTotalShifts(staffId);
    const workingDays = getWorkingDays();
    const otNeeded = totalShifts - workingDays;
    return Math.max(0, otNeeded); // ไม่ติดลบ
  };

  // ฟังก์ชันจัด OT อัตโนมัติ
  const distributeOTShifts = () => {
    // เปิด modal เลือกเจ้าหน้าที่
    setShowStaffSelectionModal(true);
  };

  // ฟังก์ชันจัด OT หลังจากเลือกเจ้าหน้าที่แล้ว
  const executeOTDistribution = () => {
    if (selectedStaffForOT.length === 0) {
      alert('กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 คน');
      return;
    }

    if (!window.confirm(`คุณต้องการจัด OT สำหรับเจ้าหน้าที่ที่เลือก (${selectedStaffForOT.length} คน) หรือไม่? การดำเนินการนี้จะเปลี่ยนสีของเวรบางส่วน`)) {
      return;
    }

    try {
      const newScheduleData = { ...scheduleData };
      const workingDays = getWorkingDays();

      // จัด OT สำหรับเจ้าหน้าที่ที่เลือก
      const staffToProcess = otDistributionMode === 'all' ? staffList : staffList.filter(staff => selectedStaffForOT.includes(staff.id));
      
      staffToProcess.forEach(staff => {
        const totalShifts = calculateTotalShifts(staff.id);
        const otNeeded = Math.max(0, totalShifts - workingDays);
        
        if (otNeeded > 0) {
          console.log(`🔄 จัด OT สำหรับ ${staff.firstName} ${staff.lastName}: ต้องการ ${otNeeded} OT`);
          
          let otAssigned = 0;
          let currentSalaryShifts = 0; // นับค่าเวรปัจจุบัน
          
          // นับสัดส่วน OT ที่ต้องการ
          const otTargets = {
            morning: Math.round(otNeeded * 0.5),    // ช: 50%
            afternoon: Math.round(otNeeded * 0.2),  // บ: 20%
            night: Math.round(otNeeded * 0.2),      // ด: 20%
            mb: Math.round(otNeeded * 0.1)          // MB: 10%
          };
          
          // นับ OT ที่จัดแล้วตามประเภท
          let otAssignedByType = {
            morning: 0,   // ช
            afternoon: 0, // บ
            night: 0,     // ด
            mb: 0         // MB
          };
          
          // รวบรวมวันที่ที่มีเวรที่สามารถเป็น OT ได้
          const eligibleDays = [];
          
          for (let day = 1; day <= daysInMonth; day++) {
            const dayData = newScheduleData[day] || {};
            const mainShift = dayData[staff.id];
            const extraShift = dayData[`${staff.id}_extra`];
            
            if (mainShift || extraShift) {
              const mainFormatted = getCellFormat(mainShift);
              const extraFormatted = getCellFormat(extraShift);
              
              // ตรวจสอบว่าช่องไหนสามารถเป็น OT ได้
              const canBeOT = (formatted) => {
                const text = formatted.text;
                // เวรที่สามารถเป็น OT ได้: ช, บ, ด, MB
                return ['ช', 'บ', 'ด', 'MB'].includes(text);
              };
              
              const mainCanBeOT = mainShift && canBeOT(mainFormatted);
              const extraCanBeOT = extraShift && canBeOT(extraFormatted);
              
              if (mainCanBeOT || extraCanBeOT) {
                eligibleDays.push({
                  day,
                  mainShift: mainShift ? { ...mainFormatted, canBeOT: mainCanBeOT } : null,
                  extraShift: extraShift ? { ...extraFormatted, canBeOT: extraCanBeOT } : null
                });
              }
            }
          }
          
          // เรียงลำดับตามความสำคัญและกระจายทั่วเดือน
          eligibleDays.sort((a, b) => {
            const aPriority = getDayPriority(a);
            const bPriority = getDayPriority(b);
            
            // เรียงตามความสำคัญ (ตัวเลขน้อย = สำคัญมาก)
            if (aPriority !== bPriority) {
              return aPriority - bPriority;
            }
            
            // ถ้าความสำคัญเท่ากัน ให้กระจายทั่วเดือนแบบสมดุล
            const aDay = a.day;
            const bDay = b.day;
            
            // แบ่งเดือนเป็น 7 ส่วนเพื่อกระจายให้ทั่วเดือนมากขึ้น
            const aSection = Math.floor((aDay - 1) / (daysInMonth / 7));
            const bSection = Math.floor((bDay - 1) / (daysInMonth / 7));
            
            if (aSection !== bSection) {
              return aSection - bSection;
            }
            
            // ถ้าอยู่ในส่วนเดียวกัน ให้สลับลำดับเพื่อกระจาย
            if (aSection % 2 === 0) {
              return aDay - bDay; // ส่วนคู่: เรียงตามวันที่
            } else {
              return bDay - aDay; // ส่วนคี่: สลับลำดับ
            }
          });
          
          // จัด OT ตามลำดับความสำคัญและสัดส่วนที่ต้องการ
          for (const dayInfo of eligibleDays) {
            if (otAssigned >= otNeeded) break;
            
            const { day, mainShift, extraShift } = dayInfo;
            const dayData = newScheduleData[day] || {};
            
            // ตรวจสอบว่าวันนั้นมีเวรกี่ช่อง
            const hasMainShift = mainShift && mainShift.canBeOT;
            const hasExtraShift = extraShift && extraShift.canBeOT;
            
            if (hasMainShift && hasExtraShift) {
              // มีเวรทั้ง 2 ช่อง - ต้องเลือกช่องใดช่องหนึ่งเป็น OT
              const mainText = mainShift.text;
              const extraText = extraShift.text;
              
              // ข้อกำหนดพิเศษ: ถ้าช่องบนเป็นประชุม (พื้นเหลือง) และช่องล่างเป็น บ/ด
              if (isMeetingShift(mainShift) && ['บ', 'ด'].includes(extraText)) {
                // ช่องล่างต้องเป็น OT
                const shiftType = extraText === 'บ' ? 'afternoon' : 'night';
                if (otAssignedByType[shiftType] < otTargets[shiftType] || currentSalaryShifts < 16) {
                  const newExtraShift = {
                    ...extraShift,
                    color: '#FF0000'
                  };
                  dayData[`${staff.id}_extra`] = JSON.stringify(newExtraShift);
                  otAssigned++;
                  otAssignedByType[shiftType]++;
                  if (shiftType === 'afternoon' || shiftType === 'night') {
                    currentSalaryShifts++;
                  }
                  console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${extraText} (แถวที่ 2) - ตามข้อกำหนดพิเศษ + เพิ่มค่าเวร`);
                }
              }
              // ข้อกำหนดพิเศษ: ถ้าช่องบนเป็น ด และช่องล่างเป็นประชุม (พื้นเหลือง)
              else if (mainText === 'ด' && isMeetingShift(extraShift)) {
                // ช่องบนต้องเป็น OT
                if (otAssignedByType.night < otTargets.night || currentSalaryShifts < 16) {
                  const newMainShift = {
                    ...mainShift,
                    color: '#FF0000'
                  };
                  dayData[staff.id] = JSON.stringify(newMainShift);
                  otAssigned++;
                  otAssignedByType.night++;
                  currentSalaryShifts++;
                  console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${mainText} (แถวที่ 1) - ตามข้อกำหนดพิเศษ + เพิ่มค่าเวร`);
                }
              }
              // กรณีทั่วไป: เลือกช่องที่เหมาะสมที่สุดตามสัดส่วน
              else {
                // ตรวจสอบกรณีพิเศษ: แถวบน ช + แถวล่าง บ
                if (mainText === 'ช' && extraText === 'บ') {
                  // เลือก "ช" แถวบนก่อนเสมอ
                  const newMainShift = {
                    ...mainShift,
                    color: '#FF0000'
                  };
                  dayData[staff.id] = JSON.stringify(newMainShift);
                  otAssigned++;
                  otAssignedByType.morning++;
                  console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${mainText} (แถวที่ 1) - แถวบน ช + แถวล่าง บ`);
                } else {
                  // เลือกช่องที่จะเป็น OT ตามสัดส่วนที่ต้องการ
                  const selectedShift = selectShiftForOT(mainShift, extraShift, otTargets, otAssignedByType, currentSalaryShifts);
                
                  if (selectedShift) {
                    const { shift, isMain, shiftType } = selectedShift;
                  
                  if (isMain) {
                    const newMainShift = {
                      ...shift,
                      color: '#FF0000'
                    };
                    dayData[staff.id] = JSON.stringify(newMainShift);
                    otAssigned++;
                    otAssignedByType[shiftType]++;
                    if (shiftType === 'afternoon' || shiftType === 'night') {
                      currentSalaryShifts++;
                    }
                    console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${shift.text} (แถวที่ 1) - ${shiftType}`);
                  } else {
                    const newExtraShift = {
                      ...shift,
                      color: '#FF0000'
                    };
                    dayData[`${staff.id}_extra`] = JSON.stringify(newExtraShift);
                    otAssigned++;
                    otAssignedByType[shiftType]++;
                    if (shiftType === 'afternoon' || shiftType === 'night') {
                      currentSalaryShifts++;
                    }
                    console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${shift.text} (แถวที่ 2) - ${shiftType}`);
                  }
                } else {
                  // ถ้าไม่มีเวรที่เหมาะสม ให้เลือกเวรใดเวรหนึ่งเป็น OT
                  if (mainShift) {
                    const newMainShift = {
                      ...mainShift,
                      color: '#FF0000'
                    };
                    dayData[staff.id] = JSON.stringify(newMainShift);
                    otAssigned++;
                    const shiftType = getShiftType(mainShift.text);
                    otAssignedByType[shiftType]++;
                    if (shiftType === 'afternoon' || shiftType === 'night') {
                      currentSalaryShifts++;
                    }
                    console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${mainShift.text} (แถวที่ 1) - ฉุกเฉิน`);
                  } else if (extraShift) {
                    const newExtraShift = {
                      ...extraShift,
                      color: '#FF0000'
                    };
                    dayData[`${staff.id}_extra`] = JSON.stringify(newExtraShift);
                    otAssigned++;
                    const shiftType = getShiftType(extraShift.text);
                    otAssignedByType[shiftType]++;
                    if (shiftType === 'afternoon' || shiftType === 'night') {
                      currentSalaryShifts++;
                    }
                    console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${extraShift.text} (แถวที่ 2) - ฉุกเฉิน`);
                  }
                }
              }
            }
          } else if (hasMainShift) {
              // มีเวรเฉพาะช่องที่ 1
              const shiftType = getShiftType(mainShift.text);
              if (otAssignedByType[shiftType] < otTargets[shiftType]) {
                const newMainShift = {
                  ...mainShift,
                  color: '#FF0000'
                };
                dayData[staff.id] = JSON.stringify(newMainShift);
                otAssigned++;
                otAssignedByType[shiftType]++;
                if (shiftType === 'afternoon' || shiftType === 'night') {
                  currentSalaryShifts++;
                }
                console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${mainShift.text} (แถวที่ 1) - ${shiftType}`);
              } else {
                // ถ้าเต็มสัดส่วนแล้ว แต่ยังต้องการ OT อยู่ ให้จัด OT ฉุกเฉิน
                const newMainShift = {
                  ...mainShift,
                  color: '#FF0000'
                };
                dayData[staff.id] = JSON.stringify(newMainShift);
                otAssigned++;
                otAssignedByType[shiftType]++;
                if (shiftType === 'afternoon' || shiftType === 'night') {
                  currentSalaryShifts++;
                }
                console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${mainShift.text} (แถวที่ 1) - ฉุกเฉิน`);
              }
            } else if (hasExtraShift) {
              // มีเวรเฉพาะช่องที่ 2
              const shiftType = getShiftType(extraShift.text);
              if (otAssignedByType[shiftType] < otTargets[shiftType]) {
                const newExtraShift = {
                  ...extraShift,
                  color: '#FF0000'
                };
                dayData[`${staff.id}_extra`] = JSON.stringify(newExtraShift);
                otAssigned++;
                otAssignedByType[shiftType]++;
                if (shiftType === 'afternoon' || shiftType === 'night') {
                  currentSalaryShifts++;
                }
                console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${extraShift.text} (แถวที่ 2) - ${shiftType}`);
              } else {
                // ถ้าเต็มสัดส่วนแล้ว แต่ยังต้องการ OT อยู่ ให้จัด OT ฉุกเฉิน
                const newExtraShift = {
                  ...extraShift,
                  color: '#FF0000'
                };
                dayData[`${staff.id}_extra`] = JSON.stringify(newExtraShift);
                otAssigned++;
                otAssignedByType[shiftType]++;
                if (shiftType === 'afternoon' || shiftType === 'night') {
                  currentSalaryShifts++;
                }
                console.log(`  📅 วันที่ ${day}: ใส่สีแดงให้ ${extraShift.text} (แถวที่ 2) - ฉุกเฉิน`);
              }
            }
            
            // อัปเดตข้อมูลวัน
            newScheduleData[day] = dayData;
          }
          
          console.log(`✅ จัด OT เสร็จแล้วสำหรับ ${staff.firstName}: ${otAssigned}/${otNeeded} OT, ค่าเวร: ${currentSalaryShifts}`);
          console.log(`  📊 สัดส่วน OT ที่จัดแล้ว:`);
          console.log(`    ช: ${otAssignedByType.morning}/${otTargets.morning} (${Math.round(otAssignedByType.morning/otTargets.morning*100)}%)`);
          console.log(`    บ: ${otAssignedByType.afternoon}/${otTargets.afternoon} (${Math.round(otAssignedByType.afternoon/otTargets.afternoon*100)}%)`);
          console.log(`    ด: ${otAssignedByType.night}/${otTargets.night} (${Math.round(otAssignedByType.night/otTargets.night*100)}%)`);
          console.log(`    MB: ${otAssignedByType.mb}/${otTargets.mb} (${Math.round(otAssignedByType.mb/otTargets.mb*100)}%)`);
          
          // แสดงผลลัพธ์ค่าเวร
          if (currentSalaryShifts >= 16) {
            console.log(`  💰 ค่าเวร: ${currentSalaryShifts} (เป้าหมาย 16 ✅)`);
          } else if (currentSalaryShifts >= 13) {
            console.log(`  💰 ค่าเวร: ${currentSalaryShifts} (เป้าหมาย 16 ⚠️ ใกล้เคียง)`);
          } else {
            console.log(`  💰 ค่าเวร: ${currentSalaryShifts} (เป้าหมาย 16 ❌ ต่ำเกินไป)`);
          }
          
          // แสดงการกระจาย OT ทั่วเดือน
          const otDays = [];
          for (let day = 1; day <= daysInMonth; day++) {
            const dayData = newScheduleData[day] || {};
            const mainShift = dayData[staff.id];
            const extraShift = dayData[`${staff.id}_extra`];
            
            if (mainShift || extraShift) {
              const mainFormatted = getCellFormat(mainShift);
              const extraFormatted = getCellFormat(extraShift);
              
              if ((mainFormatted.color === '#FF0000') || (extraFormatted.color === '#FF0000')) {
                otDays.push(day);
              }
            }
          }
          
          // แบ่งเดือนเป็น 7 ส่วน
          const sections = [];
          for (let i = 0; i < 7; i++) {
            const startDay = Math.floor((daysInMonth * i) / 7) + 1;
            const endDay = Math.floor((daysInMonth * (i + 1)) / 7);
            const sectionOT = otDays.filter(day => day >= startDay && day <= endDay).length;
            sections.push(sectionOT);
          }
          
          console.log(`  📅 การกระจาย OT ทั่วเดือน: ${sections.join(' | ')} (เป้าหมาย: กระจายให้สมดุล)`);
        }
      });
      
      // อัปเดต state
      setScheduleData(newScheduleData);
      
      // แสดงผลลัพธ์
      const totalOTAssigned = staffList.reduce((total, staff) => {
        return total + calculateOTShifts(staff.id);
      }, 0);
      
      // คำนวณค่าเวรเฉลี่ย
      const totalSalaryShifts = staffToProcess.reduce((total, staff) => {
        return total + calculateSalaryShifts(staff.id);
      }, 0);
      const avgSalaryShifts = Math.round(totalSalaryShifts / staffToProcess.length);
      
      let salaryMessage = '';
      if (avgSalaryShifts >= 16) {
        salaryMessage = `ค่าเวรเฉลี่ย: ${avgSalaryShifts} (เป้าหมาย 16 ✅)`;
      } else if (avgSalaryShifts >= 13) {
        salaryMessage = `ค่าเวรเฉลี่ย: ${avgSalaryShifts} (เป้าหมาย 16 ⚠️ ใกล้เคียง)`;
      } else {
        salaryMessage = `ค่าเวรเฉลี่ย: ${avgSalaryShifts} (เป้าหมาย 16 ❌ ต่ำเกินไป)`;
      }
      
      alert(`จัด OT เสร็จเรียบร้อยแล้ว!\n\n📊 สรุป:\n- วันทำการ: ${workingDays} วัน\n- OT ทั้งหมด: ${totalOTAssigned} เวร\n- ${salaryMessage}\n- ระบบได้จัด OT อัตโนมัติตามข้อบังคับแล้ว\n- กระจาย OT ทั่วเดือนและพยายามให้ได้ค่าเวรมากที่สุด`);
      
      // ปิด modal และรีเซ็ตข้อมูล
      setShowStaffSelectionModal(false);
      setSelectedStaffForOT([]);
      setOtDistributionMode('all');
      
    } catch (error) {
      console.error('❌ Error distributing OT shifts:', error);
      alert('เกิดข้อผิดพลาดในการจัด OT กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ฟังก์ชันตรวจสอบว่าเป็นเวรประชุมหรือไม่ (พื้นเหลือง)
  const isMeetingShift = (shift) => {
    if (!shift) return false;
    const text = shift.text;
    const backgroundColor = shift.backgroundColor;
    
    // ข้อความประชุม: อาชีวะ, วิกฤต, CSSD, ฯลฯ (ที่ไม่ใช่ ช, บ, ด, MB, VA, O)
    const isMeetingText = text.length > 0 && 
      !['ช', 'บ', 'ด', 'MB', 'VA', 'O'].includes(text) && 
      !text.startsWith('ช*');
    
    // พื้นหลังเหลือง
    const isYellowBackground = backgroundColor === '#FFFF00';
    
    return isMeetingText && isYellowBackground;
  };

  // ฟังก์ชันคำนวณความสำคัญของวัน (ตัวเลขน้อย = สำคัญมาก)
  const getDayPriority = (dayInfo) => {
    const { mainShift, extraShift } = dayInfo;
    
    // ความสำคัญ 1: ข้อกำหนดพิเศษ (ประชุม + บ/ด หรือ ด + ประชุม)
    if (mainShift && extraShift) {
      const mainText = mainShift.text;
      const extraText = extraShift.text;
      
      if ((isMeetingShift(mainShift) && ['บ', 'ด'].includes(extraText)) ||
          (mainText === 'ด' && isMeetingShift(extraShift))) {
        return 1;
      }
    }
    
    // ความสำคัญ 2: แถวบน ช + แถวล่าง บ (ให้ความสำคัญสูงสุด)
    if (mainShift && extraShift) {
      const mainText = mainShift.text;
      const extraText = extraShift.text;
      
      if (mainText === 'ช' && extraText === 'บ') {
        return 2;
      }
    }
    
    // ความสำคัญ 3: เวร ช (ให้ความสำคัญสูง)
    if ((mainShift && mainShift.text === 'ช') || (extraShift && extraShift.text === 'ช')) {
      return 3;
    }
    
    // ความสำคัญ 4: มีเวรทั้ง 2 ช่อง
    if (mainShift && extraShift) {
      return 4;
    }
    
    // ความสำคัญ 5: มีเวรช่องเดียว
    return 5;
  };

  // ฟังก์ชันสร้างตารางสำหรับพิมพ์
  const generatePrintTables = () => {
    let printHTML = '';
    
    // ตารางพยาบาล - หน้าแรก
    const nurses = staffList.filter(staff => staff.position === 'พยาบาล');
    if (nurses.length > 0) {
      printHTML += `
        <div class="table-section">
          <h3 class="table-title">🩺 พยาบาล (${nurses.length} คน) - วันทำการ: ${getWorkingDays()} วัน</h3>
          ${generatePrintTable(nurses, 'พยาบาล')}
        </div>
      `;
    }
    
    // หน้าใหม่สำหรับผู้ช่วย
    printHTML += `<div class="page-break"></div>`;
    
    // ตารางผู้ช่วย - หน้าที่สอง
    const assistants = staffList.filter(staff => 
      ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(staff.position)
    );
    if (assistants.length > 0) {
      printHTML += `
        <div class="table-section">
          <h3 class="table-title">👥 ผู้ช่วยพยาบาล/ผู้ช่วยเหลือคนไข้/พาร์ททาร์ม (${assistants.length} คน) - วันทำการ: ${getWorkingDays()} วัน</h3>
          ${generatePrintTable(assistants, 'ผู้ช่วย')}
        </div>
      `;
    }
    
    return printHTML;
  };

  // ฟังก์ชันสร้างตารางเดี่ยวสำหรับพิมพ์
  const generatePrintTable = (staffList, staffType) => {
    let tableHTML = `
      <div class="schedule-table-container">
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="order-col">ลำดับ</th>
              <th class="name-col">ชื่อ-นามสกุล</th>
    `;
    
    // สร้างหัวตารางวัน
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
      
      let dayClass = 'day-col';
      if (isWeekend) dayClass += ' weekend-col';
      if (isHoliday) dayClass += ' holiday-col';
      
      tableHTML += `
        <th class="${dayClass}">
          <div class="day-header">
            <div class="day-number">${day}</div>
            <div class="day-name ${isWeekend ? 'weekend' : ''} ${isHoliday ? 'holiday' : ''}">
              ${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dayOfWeek]}
            </div>
          </div>
        </th>
      `;
    }
    
    tableHTML += `
              <th class="total-col">เวรรวม</th>
              <th class="ot-col">OT</th>
              <th class="salary-col">ค่าเวร</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // สร้างแถวข้อมูลเจ้าหน้าที่
    staffList.forEach((staff, index) => {
      // แถวที่ 1: ชื่อเจ้าหน้าที่
      tableHTML += `
        <tr>
          <td class="order-cell">${index + 1}</td>
          <td class="name-cell">
            <div class="staff-name-container">
              <div class="staff-first-name">${staff.firstName}</div>
              <div class="staff-last-name">${staff.lastName}</div>
              <div class="staff-position" data-position="${staff.position}">${staff.position}</div>
            </div>
          </td>
      `;
      
      // ข้อมูลเวรแต่ละวัน
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
        
        let dayClass = 'schedule-cell';
        if (isWeekend) dayClass += ' weekend-cell';
        if (isHoliday) dayClass += ' holiday-cell';
        
        const cellValue = scheduleData[day]?.[staff.id] || '';
        const formattedValue = getCellFormat(cellValue);
        
        tableHTML += `
          <td class="${dayClass}">
            <div class="cell-input">${formattedValue.text || ''}</div>
          </td>
        `;
      }
      
      // คอลัมน์สรุป
      const otNeeded = calculateOTNeeded(staff.id);
      const otNeededText = otNeeded > 0 ? ` (ต้องการ OT: ${otNeeded})` : '';
      
      tableHTML += `
        <td class="total-col">${calculateTotalShifts(staff.id)}${otNeededText}</td>
        <td class="ot-col">${calculateOTShifts(staff.id)}</td>
        <td class="salary-col">${calculateSalaryShifts(staff.id)}</td>
      </tr>
      
      <!-- แถวที่ 2: ข้อมูลเพิ่มเติม -->
      <tr>
        <td class="order-cell"></td>
        <td class="name-cell"></td>
      `;
      
      // ข้อมูลเวรเพิ่มเติมแต่ละวัน
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
        
        let dayClass = 'schedule-cell extra';
        if (isWeekend) dayClass += ' weekend-cell';
        if (isHoliday) dayClass += ' holiday-cell';
        
        const extraValue = scheduleData[day]?.[`${staff.id}_extra`] || '';
        const formattedExtraValue = getCellFormat(extraValue);
        
        tableHTML += `
          <td class="${dayClass}">
            <div class="cell-input extra">${formattedExtraValue.text || ''}</div>
          </td>
        `;
      }
      
      tableHTML += `
        <td class="total-col">${otNeeded > 0 ? `ต้องการ OT: ${otNeeded}` : ''}</td>
        <td class="ot-col"></td>
        <td class="salary-col"></td>
      </tr>
      `;
    });
    
    // แถวสรุป
    tableHTML += `
      <tr class="summary-row">
        <td class="summary-label" colspan="2">📊 สรุป ${staffType}</td>
    `;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(h => new Date(h.date).getDate() === day);
      
      let dayClass = 'summary-cell';
      if (isWeekend) dayClass += ' weekend-cell';
      if (isHoliday) dayClass += ' holiday-cell';
      
      const { morningCount, afternoonCount, nightCount } = calculateDailyStaffCount(day, staffType === 'พยาบาล' ? 'พยาบาล' : 'ผู้ช่วย');
      
      tableHTML += `
        <td class="${dayClass}">
          <div class="shift-counts">
            <div class="shift-count morning">ช:${morningCount}</div>
            <div class="shift-count afternoon">บ:${afternoonCount}</div>
            <div class="shift-count night">ด:${nightCount}</div>
          </div>
        </td>
      `;
    }
    
    tableHTML += `
        <td class="total-col">-</td>
        <td class="ot-col">-</td>
        <td class="salary-col">-</td>
      </tr>
    `;
    
    tableHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    return tableHTML;
  };

  // แยกเจ้าหน้าตามตำแหน่ง
  const nurses = staffList.filter(staff => staff.position === 'พยาบาล');
  const nurseAssistants = staffList.filter(staff => staff.position === 'ผู้ช่วยพยาบาล');
  const patientAssistants = staffList.filter(staff => staff.position === 'ผู้ช่วยเหลือคนไข้');
  const partTimes = staffList.filter(staff => staff.position === 'Part time');
  


  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();

  // ข้อมูลเดือน
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];



  // บันทึกตารางพยาบาลเป็นรูปภาพ
  const captureNurseSchedule = async () => {
    try {
      console.log('🩺 เริ่มบันทึกตารางพยาบาล...');
      
      // ตรวจสอบว่า html2canvas ทำงานได้หรือไม่
      let html2canvas;
      try {
        html2canvas = (await import('html2canvas')).default;
        console.log('✅ html2canvas import สำเร็จ');
      } catch (importError) {
        console.error('❌ Error importing html2canvas:', importError);
        showPopup('ไม่สามารถโหลด html2canvas ได้', 'error');
        return;
      }
      
      // Capture ตารางพยาบาล - ใช้ CSS selector ที่ถูกต้อง
      let nurseTable = null;
      
      // หาตารางพยาบาลโดยดูจากเนื้อหา
      const allSections = document.querySelectorAll('.schedule-section');
      console.log('📊 พบ schedule sections:', allSections.length);
      
      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        const titleElement = section.querySelector('.table-title');
        const titleText = titleElement?.textContent || '';
        console.log(`📋 Section ${i} title:`, titleText);
        
        if (titleText.includes('พยาบาล') && !titleText.includes('ผู้ช่วย')) {
          nurseTable = section.querySelector('.schedule-table-container');
          console.log('✅ พบตารางพยาบาลที่ section:', i);
          break;
        }
      }
      
      // ถ้าไม่เจอ ลองหาแบบอื่น
      if (!nurseTable) {
        // console.log('🔍 ลองหาแบบอื่น...');
        if (allSections.length > 0) {
          nurseTable = allSections[0].querySelector('.schedule-table-container');
        }
      }
      
      // console.log('🔍 ตารางพยาบาล element:', nurseTable);
      
      // Debug: ดูข้อมูลของ element ที่เลือก
      if (nurseTable) {
        const titleElement = nurseTable.closest('.schedule-section')?.querySelector('.table-title');
        console.log('📋 ชื่อตารางพยาบาล:', titleElement?.textContent);
      }
      
      if (!nurseTable) {
        console.log('❌ ไม่พบตารางพยาบาล');
        showPopup('ไม่พบตารางพยาบาล', 'error');
        return;
      }

      console.log('📸 เริ่ม capture ตารางพยาบาล...');
      const canvas = await html2canvas(nurseTable, {
        backgroundColor: '#ffffff',
        scale: 1, // ลดจาก 2 เป็น 1 เพื่อลดขนาด
        useCORS: true,
        allowTaint: true
      });
      console.log('✅ Capture ตารางพยาบาลเสร็จแล้ว');

      canvas.toBlob(async (blob) => {
        try {
          console.log('💾 เริ่มบันทึกลง Firestore...');
          
          // แปลง canvas เป็น Base64 ด้วยคุณภาพต่ำเพื่อลดขนาด
          const dataURL = canvas.toDataURL('image/jpeg', 0.6); // เปลี่ยนเป็น JPEG และลดคุณภาพ
          console.log('✅ แปลงรูปภาพเป็น Base64 สำเร็จ');
          
          // ตรวจสอบขนาดรูปภาพ (Firebase limit: 1MB = 1,048,576 bytes)
          const imageSize = Math.ceil((dataURL.length * 3) / 4); // ประมาณขนาด Base64
          console.log('📏 ขนาดรูปภาพ:', imageSize, 'bytes');
          
          if (imageSize > 1000000) { // 1MB
            console.log('⚠️ รูปภาพใหญ่เกินไป ลองลดคุณภาพลงอีก');
            const compressedDataURL = canvas.toDataURL('image/jpeg', 0.4); // ลดคุณภาพลงอีก
            const compressedSize = Math.ceil((compressedDataURL.length * 3) / 4);
            console.log('📏 ขนาดหลังบีบอัด:', compressedSize, 'bytes');
            
            if (compressedSize > 1000000) {
              throw new Error('รูปภาพยังใหญ่เกินไป แม้หลังบีบอัดแล้ว');
            }
            
            dataURL = compressedDataURL;
          }
          
          const scheduleData = {
            month: months[currentMonth],
            year: currentYear,
            staffType: 'พยาบาล',
            totalStaff: staffList.filter(s => s.position === 'พยาบาล').length,
            imageData: dataURL, // ใช้ Base64 แทน URL
            imageType: 'base64',
            savedAt: new Date().toISOString(),
            createdBy: user?.uid || 'unknown'
          };

          console.log('📝 ข้อมูลที่จะบันทึก:', {
            ...scheduleData,
            imageData: scheduleData.imageData.substring(0, 100) + '...' // แสดงแค่ส่วนต้น
          });
          
          await addDoc(collection(db, 'savedSchedules'), scheduleData);
          console.log('✅ บันทึกลง Firestore เสร็จแล้ว');
          
          showPopup('บันทึกตารางพยาบาลเรียบร้อยแล้ว', 'success');
          
        } catch (error) {
          console.error('❌ Error saving nurse schedule image:', error);
          
          // แสดงข้อความ error ที่ชัดเจนขึ้น
          let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ';
          if (error.message.includes('longer than 1048487 bytes')) {
            errorMessage = 'รูปภาพมีขนาดใหญ่เกินไป กรุณาลองใหม่อีกครั้ง';
          } else if (error.message.includes('รูปภาพยังใหญ่เกินไป')) {
            errorMessage = 'ไม่สามารถบีบอัดรูปภาพได้ กรุณาลองใหม่อีกครั้ง';
          }
          
          showPopup(errorMessage, 'error');
        }
      }, 'image/jpeg', 0.6);

    } catch (error) {
      console.error('❌ Error capturing nurse schedule:', error);
      showPopup('เกิดข้อผิดพลาดในการ capture ตารางพยาบาล', 'error');
    }
  };

  // บันทึกตารางผู้ช่วยพยาบาลเป็นรูปภาพ
  const captureAssistantSchedule = async () => {
    try {
      console.log('👥 เริ่มบันทึกตารางผู้ช่วยพยาบาล...');
      
      // ตรวจสอบว่า html2canvas ทำงานได้หรือไม่
      let html2canvas;
      try {
        html2canvas = (await import('html2canvas')).default;
        console.log('✅ html2canvas import สำเร็จ');
      } catch (importError) {
        console.error('❌ Error importing html2canvas:', importError);
        showPopup('ไม่สามารถโหลด html2canvas ได้', 'error');
        return;
      }
      
      // Capture ตารางผู้ช่วยพยาบาล - ใช้ CSS selector ที่ถูกต้อง
      let assistantTable = null;
      
      // หาตารางผู้ช่วยพยาบาลโดยดูจากเนื้อหา
      const allSections = document.querySelectorAll('.schedule-section');
      console.log('📊 พบ schedule sections:', allSections.length);
      
      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        const titleElement = section.querySelector('.table-title');
        const titleText = titleElement?.textContent || '';
        console.log(`📋 Section ${i} title:`, titleText);
        
        if (titleText.includes('ผู้ช่วย') || titleText.includes('พาร์ททาร์ม')) {
          assistantTable = section.querySelector('.schedule-table-container');
          console.log('✅ พบตารางผู้ช่วยพยาบาลที่ section:', i);
          break;
        }
      }
      
      // ถ้าไม่เจอ ลองหาแบบอื่น
      if (!assistantTable) {
        // console.log('🔍 ลองหาแบบอื่น...');
        if (allSections.length > 1) {
          assistantTable = allSections[1].querySelector('.schedule-table-container');
        }
      }
      
      // console.log('🔍 ตารางผู้ช่วยพยาบาล element:', assistantTable);
      
      // Debug: ดูข้อมูลของ element ที่เลือก
      if (assistantTable) {
        const titleElement = assistantTable.closest('.schedule-section')?.querySelector('.table-title');
        console.log('📋 ชื่อตารางผู้ช่วยพยาบาล:', titleElement?.textContent);
      }
      
      if (!assistantTable) {
        console.log('❌ ไม่พบตารางผู้ช่วยพยาบาล');
        showPopup('ไม่พบตารางผู้ช่วยพยาบาล', 'error');
        return;
      }

      console.log('📸 เริ่ม capture ตารางผู้ช่วยพยาบาล...');
      const canvas = await html2canvas(assistantTable, {
        backgroundColor: '#ffffff',
        scale: 1, // ลดจาก 2 เป็น 1 เพื่อลดขนาด
        useCORS: true,
        allowTaint: true
      });
      console.log('✅ Capture ตารางผู้ช่วยพยาบาลเสร็จแล้ว');

      canvas.toBlob(async (blob) => {
        try {
          console.log('💾 เริ่มบันทึกลง Firestore...');
          
          // แปลง canvas เป็น Base64 ด้วยคุณภาพต่ำเพื่อลดขนาด
          const dataURL = canvas.toDataURL('image/jpeg', 0.6); // เปลี่ยนเป็น JPEG และลดคุณภาพ
          console.log('✅ แปลงรูปภาพเป็น Base64 สำเร็จ');
          
          // ตรวจสอบขนาดรูปภาพ (Firebase limit: 1MB = 1,048,576 bytes)
          const imageSize = Math.ceil((dataURL.length * 3) / 4); // ประมาณขนาด Base64
          console.log('📏 ขนาดรูปภาพ:', imageSize, 'bytes');
          
          if (imageSize > 1000000) { // 1MB
            console.log('⚠️ รูปภาพใหญ่เกินไป ลองลดคุณภาพลงอีก');
            const compressedDataURL = canvas.toDataURL('image/jpeg', 0.4); // ลดคุณภาพลงอีก
            const compressedSize = Math.ceil((compressedDataURL.length * 3) / 4);
            console.log('📏 ขนาดหลังบีบอัด:', compressedSize, 'bytes');
            
            if (compressedSize > 1000000) {
              throw new Error('รูปภาพยังใหญ่เกินไป แม้หลังบีบอัดแล้ว');
            }
            
            dataURL = compressedDataURL;
          }
          
          const scheduleData = {
            month: months[currentMonth],
            year: currentYear,
            staffType: 'ผู้ช่วยพยาบาล/ผู้ช่วยเหลือคนไข้/พาร์ททาร์ม',
            totalStaff: staffList.filter(s => ['ผู้ช่วยพยาบาล', 'ผู้ช่วยเหลือคนไข้', 'Part time'].includes(s.position)).length,
            imageData: dataURL, // ใช้ Base64 แทน URL
            imageType: 'base64',
            savedAt: new Date().toISOString(),
            createdBy: user?.uid || 'unknown'
          };

          console.log('📝 ข้อมูลที่จะบันทึก:', {
            ...scheduleData,
            imageData: scheduleData.imageData.substring(0, 100) + '...' // แสดงแค่ส่วนต้น
          });
          
          await addDoc(collection(db, 'savedSchedules'), scheduleData);
          console.log('✅ บันทึกลง Firestore เสร็จแล้ว');
          
          showPopup('บันทึกตารางผู้ช่วยพยาบาลเรียบร้อยแล้ว', 'success');
          
        } catch (error) {
          console.error('❌ Error saving assistant schedule image:', error);
          
          // แสดงข้อความ error ที่ชัดเจนขึ้น
          let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ';
          if (error.message.includes('longer than 1048487 bytes')) {
            errorMessage = 'รูปภาพมีขนาดใหญ่เกินไป กรุณาลองใหม่อีกครั้ง';
          } else if (error.message.includes('รูปภาพยังใหญ่เกินไป')) {
            errorMessage = 'ไม่สามารถบีบอัดรูปภาพได้ กรุณาลองใหม่อีกครั้ง';
          }
          
          showPopup(errorMessage, 'error');
        }
      }, 'image/jpeg', 0.6);

    } catch (error) {
      console.error('❌ Error capturing assistant schedule:', error);
      showPopup('เกิดข้อผิดพลาดในการ capture ตารางผู้ช่วยพยาบาล', 'error');
    }
  };

  // บันทึกทั้ง 2 ตาราง
  const captureBothSchedules = async () => {
    try {
      console.log('🚀 เริ่มบันทึกทั้ง 2 ตาราง...');
      console.log('📊 User role:', user?.role);
      console.log('🔐 Can edit schedule:', user?.canEditSchedule);
      
      // แสดงตารางเต็มก่อน capture เพื่อให้เห็นครบทุกคน
      if (!showFullTable) {
        console.log('📋 แสดงตารางเต็มก่อน capture...');
        toggleFullTable();
        // รอให้ตารางแสดงเต็ม
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Debug: ดู HTML structure
              // console.log('🔍 ตรวจสอบ HTML structure...');
      const allScheduleSections = document.querySelectorAll('.schedule-table-section, .schedule-section');
      console.log('📊 พบ schedule sections:', allScheduleSections.length);
      allScheduleSections.forEach((section, index) => {
        console.log(`📋 Section ${index}:`, section.className, section);
      });
      
      const allTableContainers = document.querySelectorAll('.schedule-table-container');
      console.log('📊 พบ table containers:', allTableContainers.length);
      allTableContainers.forEach((container, index) => {
        console.log(`📋 Container ${index}:`, container.className, container);
      });
      
      await captureNurseSchedule();
      console.log('✅ บันทึกตารางพยาบาลเสร็จแล้ว');
      
      // รอสักครู่แล้วบันทึกตารางที่ 2
      setTimeout(async () => {
        console.log('🔄 เริ่มบันทึกตารางผู้ช่วยพยาบาล...');
        await captureAssistantSchedule();
        console.log('✅ บันทึกตารางผู้ช่วยพยาบาลเสร็จแล้ว');
        
        // หลังจาก capture เสร็จแล้ว คืนค่าตารางเป็นแบบปกติ
        setTimeout(() => {
          if (showFullTable) {
            console.log('📋 คืนค่าตารางเป็นแบบปกติ...');
            toggleFullTable();
          }
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error('❌ Error capturing both schedules:', error);
      showPopup('เกิดข้อผิดพลาดในการบันทึกตารางเวร', 'error');
      
      // คืนค่าตารางเป็นแบบปกติในกรณีเกิดข้อผิดพลาด
      if (showFullTable) {
        toggleFullTable();
      }
    }
  };

  // ฟังก์ชันแสดง popup
  const showPopup = (message, type = 'success') => {
    console.log('🔔 แสดง popup:', { message, type });
    setPopup({ show: true, message, type });
    // ปิด popup อัตโนมัติหลังจาก 3 วินาที
    setTimeout(() => {
      console.log('⏰ ปิด popup อัตโนมัติ');
      setPopup({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ฟังก์ชันแสดงตารางเต็ม
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

  // ฟังก์ชันปิด popup
  const closePopup = () => {
    setPopup({ show: false, message: '', type: 'success' });
  };

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

  // ฟังก์ชันระบุประเภทของเวร
  const getShiftType = (text) => {
    if (text === 'ช') return 'morning';
    if (text === 'บ') return 'afternoon';
    if (text === 'ด') return 'night';
    if (text === 'MB') return 'mb';
    return 'morning'; // ค่าเริ่มต้น
  };

  // ฟังก์ชันเลือกเวรที่จะเป็น OT ตามสัดส่วนที่ต้องการ
  const selectShiftForOT = (mainShift, extraShift, otTargets, otAssignedByType, currentSalaryShifts) => {
    const mainText = mainShift.text;
    const extraText = extraShift.text;
    
    // ให้ความสำคัญกับเวร ช ก่อน (80% ของเวร ช ที่มี)
    const morningTarget = Math.round(otTargets.morning * 0.8); // 80% ของเป้าหมาย
    
    // ตรวจสอบว่าเวรไหนยังไม่เต็มสัดส่วน
    const availableShifts = [];
    
    // ตรวจสอบ mainShift
    const mainType = getShiftType(mainText);
    if (otAssignedByType[mainType] < otTargets[mainType]) {
      // ให้ความสำคัญกับเวร ช ก่อน
      let priority = getShiftPriority(mainType, mainText, currentSalaryShifts);
      if (mainType === 'morning' && otAssignedByType.morning < morningTarget) {
        priority += 2000; // ให้ความสำคัญสูงสุดกับเวร ช ใน 80% แรก
      }
      
      availableShifts.push({
        shift: mainShift,
        isMain: true,
        shiftType: mainType,
        priority: priority
      });
    }
    
    // ตรวจสอบ extraShift
    const extraType = getShiftType(extraText);
    if (otAssignedByType[extraType] < otTargets[extraType]) {
      // ให้ความสำคัญกับเวร ช ก่อน
      let priority = getShiftPriority(extraType, extraText, currentSalaryShifts);
      if (extraType === 'morning' && otAssignedByType.morning < morningTarget) {
        priority += 2000; // ให้ความสำคัญสูงสุดกับเวร ช ใน 80% แรก
      }
      
      availableShifts.push({
        shift: extraShift,
        isMain: false,
        shiftType: extraType,
        priority: priority
      });
    }
    
    // ถ้าไม่มีเวรที่ตรงตามสัดส่วน ให้เลือกเวรที่ยังไม่เต็มสัดส่วนมากที่สุด
    if (availableShifts.length === 0) {
      // หาเวรที่ขาดมากที่สุด
      let maxDeficit = 0;
      let bestShift = null;
      
      if (mainShift) {
        const mainType = getShiftType(mainText);
        const deficit = otTargets[mainType] - otAssignedByType[mainType];
        if (deficit > maxDeficit) {
          maxDeficit = deficit;
          bestShift = {
            shift: mainShift,
            isMain: true,
            shiftType: mainType,
            priority: getShiftPriority(mainType, mainText, currentSalaryShifts)
          };
        }
      }
      
      if (extraShift) {
        const extraType = getShiftType(extraText);
        const deficit = otTargets[extraType] - otAssignedByType[extraType];
        if (deficit > maxDeficit) {
          maxDeficit = deficit;
          bestShift = {
            shift: extraShift,
            isMain: false,
            shiftType: extraType,
            priority: getShiftPriority(extraType, extraText, currentSalaryShifts)
          };
        }
      }
      
      return bestShift;
    }
    
    // เลือกเวรที่มีความสำคัญสูงสุด
    availableShifts.sort((a, b) => b.priority - a.priority);
    return availableShifts[0];
  };

  // ฟังก์ชันคำนวณความสำคัญของเวร
  const getShiftPriority = (shiftType, text, currentSalaryShifts) => {
    let priority = 0;
    
    // ให้ความสำคัญสูงสุดกับเวร บ/ด (ค่าเวร) เมื่อยังไม่ถึง 16
    if (shiftType === 'afternoon' || shiftType === 'night') {
      if (currentSalaryShifts < 13) {
        priority += 3000; // ความสำคัญสูงสุดเมื่อค่าเวรน้อยกว่า 13
      } else if (currentSalaryShifts < 16) {
        priority += 2000; // ความสำคัญสูงเมื่อค่าเวร 13-15
      } else {
        priority += 500; // ความสำคัญปกติเมื่อค่าเวร 16+
      }
    }
    
    // ให้ความสำคัญตามสัดส่วนที่ต้องการ (ยิ่งขาดมาก ยิ่งสำคัญมาก)
    if (shiftType === 'morning') priority += 50;
    if (shiftType === 'afternoon') priority += 20;
    if (shiftType === 'night') priority += 20;
    if (shiftType === 'mb') priority += 10;
    
    return priority;
  };

  // ฟังก์ชันจัดการการเลือกเจ้าหน้าที่
  const handleStaffSelection = (staffId) => {
    setSelectedStaffForOT(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  // ฟังก์ชันเลือกเจ้าหน้าที่ทั้งหมด
  const selectAllStaff = () => {
    setSelectedStaffForOT(staffList.map(staff => staff.id));
  };

  // ฟังก์ชันล้างการเลือกเจ้าหน้าที่ทั้งหมด
  const clearAllStaffSelection = () => {
    setSelectedStaffForOT([]);
  };

  // ฟังก์ชันปิด modal
  const closeStaffSelectionModal = () => {
    setShowStaffSelectionModal(false);
    setSelectedStaffForOT([]);
    setOtDistributionMode('all');
  };

  // ฟังก์ชัน Undo แบบง่าย (ย้อนกลับการกระทำล่าสุด)
  const undoLastAction = () => {
    console.log('🔍 Undo clicked!');
    console.log('🔍 lastAction:', lastAction);
    console.log('🔍 user?.canEditSchedule:', user?.canEditSchedule);
    
    if (lastAction && user?.canEditSchedule) {
      console.log('🔍 Executing undo...');
      setScheduleData(prev => {
        const newData = { ...prev };
        
        // ย้อนกลับการกระทำล่าสุด
        if (lastAction.type === 'insertShift') {
          lastAction.cells.forEach(cell => {
            if (newData[cell.day]) {
              newData[cell.day][cell.staffId] = cell.originalValue;
            }
          });
        }
        
        return newData;
      });
      
      // ล้างประวัติการกระทำ
      setLastAction(null);
      
      // แสดง popup แจ้งเตือน
      showPopup('ย้อนกลับการกระทำล่าสุดเรียบร้อยแล้ว', 'success');
    } else {
      console.log('🔍 Cannot undo:', { lastAction: !!lastAction, canEdit: !!user?.canEditSchedule });
      if (!lastAction) {
        showPopup('ไม่มีประวัติการกระทำล่าสุด', 'warning');
      } else if (!user?.canEditSchedule) {
        showPopup('คุณไม่มีสิทธิ์แก้ไขตารางเวร', 'error');
      }
    }
  };

  // ฟังก์ชันใส่เวรในช่องที่เลือก
  const insertShiftToSelectedCells = (shiftType, color, backgroundColor = 'transparent') => {
    if (selectedCells.length === 0) {
      showPopup('กรุณาเลือกช่องที่ต้องการใส่เวรก่อน', 'warning');
      return;
    }

    if (!user?.canEditSchedule) {
      showPopup('คุณไม่มีสิทธิ์แก้ไขตารางเวร', 'error');
      return;
    }

    try {
      // เก็บข้อมูลเดิมเพื่อประวัติ
      const originalValues = [];
      selectedCells.forEach(cell => {
        const { day, staffId } = cell;
        if (scheduleData[day] && scheduleData[day][staffId]) {
          originalValues.push({
            day: day,
            staffId: staffId,
            originalValue: scheduleData[day][staffId]
          });
        } else {
          originalValues.push({
            day: day,
            staffId: staffId,
            originalValue: ''
          });
        }
      });

      setScheduleData(prev => {
        const newData = { ...prev };
        
        selectedCells.forEach(cell => {
          const { day, staffId } = cell;
          
          if (newData[day]) {
            // สร้างข้อมูลเวรใหม่
            const newShift = {
              text: shiftType,
              color: color,
              fontSize: textFormat.fontSize,
              backgroundColor: backgroundColor
            };
            
            // บันทึกเวรในรูปแบบ JSON string
            newData[day][staffId] = JSON.stringify(newShift);
          }
        });
        
        return newData;
      });

      // เก็บประวัติการกระทำล่าสุด
      const actionData = {
        type: 'insertShift',
        cells: originalValues,
        description: `ใส่เวร${shiftType}ใน ${selectedCells.length} ช่อง`
      };
      
      console.log('🔍 Storing action history:', actionData);
      setLastAction(actionData);
      
      // แสดง popup แจ้งเตือน
      let shiftName = shiftType;
      if (shiftType === 'ช') shiftName = 'เช้า';
      else if (shiftType === 'บ') shiftName = 'บ่าย';
      else if (shiftType === 'ด') shiftName = 'ดึก';
      else if (shiftType === 'VA') shiftName = 'VA';
      else if (shiftType === 'O') shiftName = 'O';
      
      const colorName = color === '#000000' ? 'ดำ' : 'แดง';
      const bgInfo = backgroundColor !== 'transparent' ? ` พื้น${backgroundColor === '#FF0000' ? 'แดง' : backgroundColor}` : '';
      showPopup(`ใส่เวร${shiftName}สี${colorName}${bgInfo} ใน ${selectedCells.length} ช่องเรียบร้อยแล้ว`, 'success');
      
      // ล้างการเลือกช่อง
      setSelectedCells([]);
      setSelectedCell(null);
      
    } catch (error) {
      console.error('❌ Error inserting shift:', error);
      showPopup('เกิดข้อผิดพลาดในการใส่เวร', 'error');
    }
  };



  return (
    <div className="dashboard-content">
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
            <button 
              onClick={user?.canEditSchedule ? saveSchedule : null} 
              className="btn btn-primary"
              disabled={!user?.canEditSchedule}
            >
              💾 บันทึก
            </button>
            
            {/* ปุ่มอื่นๆ ซ่อนไว้สำหรับอนาคต - แอดมินเท่านั้น */}
            {user?.canEditSchedule && user?.role === 'admin' && (
              <>
                <button 
                  onClick={distributeOTShifts} 
                  className="btn btn-success"
                  title="จัด OT อัตโนมัติตามจำนวนเวรรวม - วันทำการ"
                >
                  ⏰ จัด OT
                </button>
                
                <button 
                  onClick={saveDraft}
                  className="btn btn-secondary"
                  title="บันทึกร่างตารางเวร"
                >
                  📝 บันทึกร่าง
                </button>
                
                {hasDraft && (
                  <>
                    <button 
                      onClick={loadDraft}
                      className="btn btn-info"
                      title="โหลดร่างตารางเวรที่บันทึกไว้"
                    >
                      📂 โหลดร่าง
                    </button>
                    <button 
                      onClick={deleteDraft}
                      className="btn btn-danger"
                      title="ลบร่างตารางเวร"
                    >
                      🗑️ ลบร่าง
                    </button>
                  </>
                )}
                
                {isDraftMode && (
                  <span className="draft-indicator" style={{ 
                    color: '#FF6B35', 
                    fontWeight: 'bold', 
                    padding: '8px 12px',
                    backgroundColor: '#FFF3E0',
                    borderRadius: '4px',
                    border: '1px solid #FF6B35'
                  }}>
                    📝 โหมดร่าง
                  </span>
                )}
                
                <button 
                  onClick={resetSchedule} 
                  className="btn btn-warning"
                >
                  🔄 รีเซ็ต
                </button>
                
                <button 
                  onClick={() => {
                    console.log('🖱️ ปุ่มส่งออกถูกคลิก!');
                    console.log('👤 User:', user);
                    console.log('🔐 User role:', user?.role);
                    if (user?.canEditSchedule) {
                      console.log('✅ มีสิทธิ์แก้ไขตารางเวร เริ่มบันทึก...');
                      captureBothSchedules();
                    } else {
                      console.log('❌ ไม่มีสิทธิ์แก้ไขตารางเวร');
                    }
                  }} 
                  className="btn btn-info"
                  title="บันทึกทั้ง 2 ตารางเวรเป็นรูปภาพ"
                >
                  📤 ส่งออก
                </button>
              </>
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
          
          {/* ปุ่มดึงข้อมูลออนไลน์ */}
          <div className="holiday-actions">
            <button
              onClick={loadHolidays}
              className="fetch-holidays-btn"
              disabled={holidayLoading}
            >
              {holidayLoading ? '🔄 กำลังดึงข้อมูล...' : '🌐 ดึงข้อมูลออนไลน์'}
            </button>
            <button
              onClick={user?.canEditSchedule ? saveHolidays : null}
              className="save-holidays-btn"
              disabled={holidays.length === 0 || !user?.canEditSchedule}
            >
              💾 บันทึกวันหยุด
            </button>
          </div>
          

          
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
                        {user?.canEditSchedule && (
                          <button
                            onClick={() => user?.canEditSchedule ? removeHoliday(holiday.id) : null}
                            className="remove-holiday-btn"
                            title="ลบวันหยุด"
                            disabled={!user?.canEditSchedule}
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

              <div className="add-holiday-form">
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => user?.role === 'admin' ? setNewHoliday(prev => ({ ...prev, date: e.target.value })) : null}
                  className="holiday-date-input"
                  placeholder="เลือกวันที่"
                  disabled={user?.role !== 'admin'}
                />
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => user?.role === 'admin' ? setNewHoliday(prev => ({ ...prev, name: e.target.value })) : null}
                  className="holiday-name-input"
                  placeholder="ชื่อวันหยุด"
                  disabled={user?.role !== 'admin'}
                />
                <button
                  onClick={user?.role === 'admin' ? addHoliday : null}
                  className="btn btn-primary add-holiday-btn"
                  disabled={!newHoliday.date || !newHoliday.name || user?.role !== 'admin'}
                >
                  ➕ เพิ่ม
                </button>
              </div>
            </>
          )}
        </div>
      </div>



      {/* ตารางเวร */}
      <div className="schedule-tables">
        {/* ตารางพยาบาล */}
        <div className="schedule-section">
          <div className="formatting-toolbar">
            <div className="toolbar-section">
              <span className="toolbar-label">สีตัวอักษร:</span>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('color', '#FF0000') : null}
                className="format-btn color-btn red"
                title="สีแดง"
                disabled={!user?.canEditSchedule}
              >
                🔴 แดง
              </button>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('color', '#000000') : null}
                className="format-btn color-btn black"
                title="สีดำ"
                disabled={!user?.canEditSchedule}
              >
                ⚫ ดำ
              </button>
            </div>
            
            <div className="toolbar-section">
              <span className="toolbar-label">ขนาดตัวอักษร:</span>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('fontSize', '8') : null}
                className="format-btn size-btn small"
                title="ขนาด 8"
                disabled={!user?.canEditSchedule}
              >
                8
              </button>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('fontSize', '14') : null}
                className="format-btn size-btn normal"
                title="ขนาด 14"
                disabled={!user?.canEditSchedule}
              >
                14
              </button>
            </div>

            {/* เพิ่มปุ่มสำหรับใส่เวร ช/บ/ด พร้อมสี */}
            <div className="toolbar-section">
              <span className="toolbar-label">ใส่เวร:</span>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ช', '#000000') : null}
                className="format-btn shift-btn morning-black"
                title="ใส่เวรเช้าสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ช
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ช', '#FF0000') : null}
                className="format-btn shift-btn morning-red"
                title="ใส่เวรเช้าสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ช
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('บ', '#000000') : null}
                className="format-btn shift-btn afternoon-black"
                title="ใส่เวรบ่ายสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                บ
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('บ', '#FF0000') : null}
                className="format-btn shift-btn afternoon-red"
                title="ใส่เวรบ่ายสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                บ
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ด', '#000000') : null}
                className="format-btn shift-btn night-black"
                title="ใส่เวรดึกสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ด
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ด', '#FF0000') : null}
                className="format-btn shift-btn night-red"
                title="ใส่เวรดึกสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ด
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('VA', '#000000', '#FF0000') : null}
                className="format-btn shift-btn va-red-bg"
                title="ใส่เวร VA ตัวอักษรดำ พื้นแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                VA
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('O', '#FF0000') : null}
                className="format-btn shift-btn o-red"
                title="ใส่เวร O สีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                O
              </button>
            </div>
            
            {/* ปุ่ม Undo */}
            <div className="toolbar-section">
              <span className="toolbar-label">ประวัติ:</span>
              <button
                onClick={undoLastAction}
                className="format-btn undo-btn"
                title="ย้อนกลับการกระทำล่าสุด"
                disabled={!user?.canEditSchedule || !lastAction}
              >
                ↩️ ย้อนกลับ
                {console.log('🔍 Undo button state:', { 
                  canEdit: !!user?.canEditSchedule, 
                  hasAction: !!lastAction,
                  disabled: !user?.canEditSchedule || !lastAction 
                })}
              </button>
            </div>
            
            <div className="toolbar-info">
              {selectedCells.length > 0 ? (
                <span className="selection-info">
                  เลือก {selectedCells.length} ช่อง
                </span>
              ) : (
                <span className="selection-info">
                  คลิกช่องเพื่อเลือก หรือ Ctrl+คลิกเพื่อเลือกหลายช่อง
                </span>
              )}
            </div>
          </div>
          
          {renderScheduleTable('พยาบาล', 'พยาบาล', '🩺')}
        </div>
        
        {/* ตารางผู้ช่วยพยาบาล/ผู้ช่วยเหลือคนไข้/พาร์ททาร์ม */}
        <div className="schedule-section">
          <div className="formatting-toolbar">
            <div className="toolbar-section">
              <span className="toolbar-label">สีตัวอักษร:</span>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('color', '#FF0000') : null}
                className="format-btn color-btn red"
                title="สีแดง"
                disabled={!user?.canEditSchedule}
              >
                🔴 แดง
              </button>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('color', '#000000') : null}
                className="format-btn color-btn black"
                title="สีดำ"
                disabled={!user?.canEditSchedule}
              >
                ⚫ ดำ
              </button>
            </div>
            
            <div className="toolbar-section">
              <span className="toolbar-label">ขนาดตัวอักษร:</span>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('fontSize', '8') : null}
                className="format-btn size-btn small"
                title="ขนาด 8"
                disabled={!user?.canEditSchedule}
              >
                8
              </button>
              <button
                onClick={() => user?.canEditSchedule ? applyTextFormat('fontSize', '14') : null}
                className="format-btn size-btn normal"
                title="ขนาด 14"
                disabled={!user?.canEditSchedule}
              >
                14
              </button>
            </div>

            {/* เพิ่มปุ่มสำหรับใส่เวร ช/บ/ด พร้อมสี */}
            <div className="toolbar-section">
              <span className="toolbar-label">ใส่เวร:</span>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ช', '#000000') : null}
                className="format-btn shift-btn morning-black"
                title="ใส่เวรเช้าสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ช
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ช', '#FF0000') : null}
                className="format-btn shift-btn morning-red"
                title="ใส่เวรเช้าสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ช
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('บ', '#000000') : null}
                className="format-btn shift-btn afternoon-black"
                title="ใส่เวรบ่ายสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                บ
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('บ', '#FF0000') : null}
                className="format-btn shift-btn afternoon-red"
                title="ใส่เวรบ่ายสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                บ
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ด', '#000000') : null}
                className="format-btn shift-btn night-black"
                title="ใส่เวรดึกสีดำ"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ด
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('ด', '#FF0000') : null}
                className="format-btn shift-btn night-red"
                title="ใส่เวรดึกสีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                ด
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('VA', '#000000', '#FF0000') : null}
                className="format-btn shift-btn va-red-bg"
                title="ใส่เวร VA ตัวอักษรดำ พื้นแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                VA
              </button>
              <button
                onClick={() => user?.canEditSchedule ? insertShiftToSelectedCells('O', '#FF0000') : null}
                className="format-btn shift-btn o-red"
                title="ใส่เวร O สีแดง"
                disabled={!user?.canEditSchedule || selectedCells.length === 0}
              >
                O
              </button>
            </div>
            
            {/* ปุ่ม Undo */}
            <div className="toolbar-section">
              <span className="toolbar-label">ประวัติ:</span>
              <button
                onClick={undoLastAction}
                className="format-btn undo-btn"
                title="ย้อนกลับการกระทำล่าสุด"
                disabled={!user?.canEditSchedule || !lastAction}
              >
                ↩️ ย้อนกลับ
                {console.log('🔍 Undo button state (ผู้ช่วย):', { 
                  canEdit: !!user?.canEditSchedule, 
                  hasAction: !!lastAction,
                  disabled: !user?.canEditSchedule || !lastAction 
                })}
              </button>
            </div>
            
            <div className="toolbar-info">
              {selectedCells.length > 0 ? (
                <span className="selection-info">
                  เลือก {selectedCells.length} ช่อง
                </span>
              ) : (
                <span className="selection-info">
                  คลิกช่องเพื่อเลือก หรือ Ctrl+คลิกเพื่อเลือกหลายช่อง
                </span>
              )}
            </div>
          </div>
          
          {renderScheduleTable('ผู้ช่วย', 'ผู้ช่วยพยาบาล/ผู้ช่วยเหลือคนไข้/พาร์ททาร์ม', '👥')}
        </div>
      </div>

      {/* แสดง Popup */}
      <CustomPopup 
        message={popup.message}
        type={popup.type}
        isVisible={popup.show}
        onClose={closePopup}
      />

      {/* Modal เลือกเจ้าหน้าที่จัด OT */}
      {showStaffSelectionModal && (
        <div className="modal-overlay">
          <div className="staff-selection-modal">
            <div className="modal-header">
              <h3>👥 เลือกเจ้าหน้าที่ที่จะจัด OT</h3>
              <button className="close-btn" onClick={closeStaffSelectionModal}>✕</button>
            </div>
            
            <div className="modal-content">
              <div className="selection-mode">
                <label>
                  <input
                    type="radio"
                    value="all"
                    checked={otDistributionMode === 'all'}
                    onChange={(e) => setOtDistributionMode(e.target.value)}
                  />
                  จัด OT ทั้งหมด ({staffList.length} คน)
                </label>
                <label>
                  <input
                    type="radio"
                    value="selected"
                    checked={otDistributionMode === 'selected'}
                    onChange={(e) => setOtDistributionMode(e.target.value)}
                  />
                  จัด OT เฉพาะเจ้าหน้าที่ที่เลือก ({selectedStaffForOT.length} คน)
                </label>
              </div>
              
              {otDistributionMode === 'selected' && (
                <>
                  <div className="staff-selection-controls">
                    <button className="btn btn-secondary" onClick={selectAllStaff}>
                      ✅ เลือกทั้งหมด
                    </button>
                    <button className="btn btn-secondary" onClick={clearAllStaffSelection}>
                      ❌ ล้างการเลือก
                    </button>
                  </div>
                  
                  <div className="staff-list">
                    {staffList.map(staff => {
                      const totalShifts = calculateTotalShifts(staff.id);
                      const workingDays = getWorkingDays();
                      const otNeeded = Math.max(0, totalShifts - workingDays);
                      
                      return (
                        <div 
                          key={staff.id} 
                          className={`staff-item ${selectedStaffForOT.includes(staff.id) ? 'selected' : ''}`}
                          onClick={() => handleStaffSelection(staff.id)}
                        >
                          <div className="staff-info">
                            <div className="staff-name">
                              {staff.firstName} {staff.lastName}
                            </div>
                            <div className="staff-position">{staff.position}</div>
                          </div>
                          <div className="staff-stats">
                            <div className="total-shifts">เวรรวม: {totalShifts}</div>
                            <div className="ot-needed">
                              {otNeeded > 0 ? `ต้องการ OT: ${otNeeded}` : 'ไม่ต้องการ OT'}
                            </div>
                          </div>
                          <div className="selection-indicator">
                            {selectedStaffForOT.includes(staff.id) ? '✅' : '⭕'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeStaffSelectionModal}>
                ❌ ยกเลิก
              </button>
              <button 
                className="btn btn-success" 
                onClick={executeOTDistribution}
                disabled={otDistributionMode === 'selected' && selectedStaffForOT.length === 0}
              >
                ⏰ จัด OT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ScheduleManagement;
