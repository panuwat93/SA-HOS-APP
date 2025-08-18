import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { auth } from '../firebase';
import { db } from '../firebase';
import './StaffManagement.css';

function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [filterPosition, setFilterPosition] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: 'พยาบาล',
    department: '',
    order: 1,
    canEditSchedule: true,
    canAssignTasks: true
  });

  const positions = [
    { value: 'พยาบาล', label: 'พยาบาล', color: '#667eea' },
    { value: 'ผู้ช่วยพยาบาล', label: 'ผู้ช่วยพยาบาล', color: '#f093fb' },
    { value: 'ผู้ช่วยเหลือคนไข้', label: 'ผู้ช่วยเหลือคนไข้', color: '#4facfe' },
    { value: 'Part time', label: 'Part time', color: '#ff9a9e' }
  ];

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
    'ห้องผู้หนักอายุรกรรม 2',
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

  // โหลดข้อมูลเจ้าหน้าที่
  useEffect(() => {
    loadStaff();
    loadCurrentAdmin();
  }, []);

  // โหลดข้อมูลแอดมินปัจจุบัน
  const loadCurrentAdmin = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentAdmin(userData);
          // อัพเดท formData ให้มีแผนกของแอดมิน
          setFormData(prev => ({
            ...prev,
            department: userData.department || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading current admin:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staff = [];
      querySnapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      
      // แสดงข้อมูลสิทธิ์ของเจ้าหน้าที่ทุกคน
      console.log('🔍 StaffManagement - All staff data:');
      staff.forEach((staffMember, index) => {
        console.log(`🔍 Staff ${index + 1}:`, {
          name: `${staffMember.firstName} ${staffMember.lastName}`,
          position: staffMember.position,
          canEditSchedule: staffMember.canEditSchedule,
          canAssignTasks: staffMember.canAssignTasks,
          department: staffMember.department
        });
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

  // เพิ่มเจ้าหน้าที่ใหม่
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const newOrder = staffList.length > 0 ? Math.max(...staffList.map(s => s.order || 0)) + 1 : 1;
      await addDoc(collection(db, 'staff'), {
        ...formData,
        order: newOrder,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      resetForm();
      loadStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  };

  // แก้ไขเจ้าหน้าที่
  const handleEditStaff = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'staff', editingStaff.id), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      setShowEditModal(false);
      setEditingStaff(null);
      resetForm();
      loadStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  // ลบเจ้าหน้าที่
  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('คุณต้องการลบเจ้าหน้าที่คนนี้หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'staff', staffId));
        loadStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  // ปรับลำดับเจ้าหน้าที่ตามรายชื่อที่กำหนด
  const reorderStaff = async () => {
    const targetOrder = [
      'นางสาวประนอม', 'นางสาวศิรินทรา', 'นางหทัยชนก', 'นางสาวโยธกา', 'นางสาวปาณิสรา',
      'นางสาวขวัญเรือน', 'นางสาวสุวรรณา', 'นางสาวนฤมล', 'นางสาวอมลกานต์', 'นางสาวนนทิยา',
      'นางสาวกรกนก', 'นางสาวสุรีรัตน์', 'นางสาวสุธิตรา', 'นางสาววิภาวี', 'นางสาวพณิดา',
      'นายภาณุวัฒน์', 'สางสาวสุกัญญา', 'นางสาวณัทชกา', 'นางสาวดวงแก้ว', 'นางสาวอรอุษา',
      'นางสาวอัมพร', 'นางสาวดวงพร', 'นางสาวกาญจนา', 'นางสาวรุ้งจินดา'
    ];

    try {
      const batch = writeBatch(db);
      
      for (let i = 0; i < targetOrder.length; i++) {
        const staff = staffList.find(s => 
          `${s.firstName} ${s.lastName}`.includes(targetOrder[i])
        );
        
        if (staff) {
          const staffRef = doc(db, 'staff', staff.id);
          batch.update(staffRef, { order: i + 1 });
        }
      }
      
      await batch.commit();
      loadStaff();
      alert('ปรับลำดับเจ้าหน้าที่เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error reordering staff:', error);
      alert('เกิดข้อผิดพลาดในการปรับลำดับ');
    }
  };

  // อัพเดทแผนกเจ้าหน้าที่ที่มีอยู่แล้ว
  const updateExistingStaffDepartments = async () => {
    if (!currentAdmin?.department) {
      alert('ไม่พบข้อมูลแผนกของแอดมิน กรุณาตรวจสอบข้อมูลผู้ใช้');
      return;
    }

    if (!window.confirm(`คุณต้องการอัพเดทแผนกเจ้าหน้าที่ทั้งหมดให้เป็น "${currentAdmin.department}" หรือไม่?\n\n⚠️ หมายเหตุ: เจ้าหน้าที่ที่ไม่มีแผนกจะถูกกำหนดให้เป็นแผนกเดียวกับแอดมิน\nการดำเนินการนี้อาจใช้เวลาสักครู่`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      staffList.forEach(staff => {
        if (!staff.department) {
          const staffRef = doc(db, 'staff', staff.id);
          batch.update(staffRef, { 
            department: currentAdmin.department,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        loadStaff();
        alert(`อัพเดทแผนกเจ้าหน้าที่เรียบร้อยแล้ว ${updatedCount} คน\nแผนก: ${currentAdmin.department}`);
      } else {
        alert('เจ้าหน้าที่ทุกคนมีแผนกแล้ว');
      }
    } catch (error) {
      console.error('Error updating staff departments:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดทแผนก');
    }
  };

  // เปิดโมดัลแก้ไข
  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      position: staff.position,
      department: staff.department || currentAdmin?.department || '',
      order: staff.order || 1,
      canEditSchedule: staff.canEditSchedule,
      canAssignTasks: staff.canAssignTasks
    });
    setShowEditModal(true);
  };

  // รีเซ็ตฟอร์ม
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      position: 'พยาบาล',
      department: currentAdmin?.department || '',
      order: 1,
      canEditSchedule: true,
      canAssignTasks: true
    });
  };

  // ฟิลเตอร์และค้นหา
  const filteredStaff = staffList.filter(staff => {
    const matchesPosition = filterPosition === 'all' || staff.position === filterPosition;
    const matchesSearch = `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  // นับจำนวนเจ้าหน้าที่ตามตำแหน่ง
  const getPositionCount = (position) => {
    return staffList.filter(staff => staff.position === position).length;
  };

  // เพิ่มฟังก์ชันกู้คืนข้อมูลเจ้าหน้าที่แบบสมบูรณ์
  const restoreMissingStaffComplete = async () => {
    try {
      console.log('🔄 กำลังกู้คืนข้อมูลเจ้าหน้าที่แบบสมบูรณ์...');
      
      // ตรวจสอบก่อนว่ามีข้อมูลอยู่แล้วหรือไม่
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const existingStaff = staffSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.firstName === 'สุกัญญา' && data.lastName === 'วุฒิเดช';
      });
      
      if (existingStaff) {
        alert('✅ นางสาวสุกัญญา วุฒิเดช มีอยู่ในระบบแล้ว!');
        return existingStaff.id;
      }
      
      // ข้อมูลของนางสาวสุกัญญา วุฒิเดช
      const missingStaff = {
        firstName: 'สุกัญญา',
        lastName: 'วุฒิเดช',
        position: 'ผู้ช่วยพยาบาล',
        department: currentAdmin?.department || 'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
        order: 17,
        canEditSchedule: true,
        canAssignTasks: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // เพิ่มข้อมูลเจ้าหน้าที่กลับเข้าไป
      const staffRef = await addDoc(collection(db, 'staff'), missingStaff);
      console.log('✅ เพิ่มเจ้าหน้าที่สำเร็จ ID:', staffRef.id);
      
      // อัพเดท staffList ใน state และเรียงลำดับใหม่
      const newStaff = { id: staffRef.id, ...missingStaff };
      const updatedStaffList = [...staffList, newStaff].sort((a, b) => (a.order || 0) - (b.order || 0));
      setStaffList(updatedStaffList);
      
      // กู้คืนตารางเวรเก่าที่มีข้อมูลของเจ้าหน้าที่คนนี้
      await restoreScheduleData(newStaff.id);
      
      alert('กู้คืนข้อมูลนางสาวสุกัญญา วุฒิเดช แบบสมบูรณ์เรียบร้อยแล้ว');
      return staffRef.id;
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการกู้คืน:', error);
      alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
      return null;
    }
  };

  // ฟังก์ชันกู้คืนข้อมูลตารางเวร
  const restoreScheduleData = async (newStaffId) => {
    try {
      console.log('📅 กำลังกู้คืนข้อมูลตารางเวร...');
      
      // ดึงข้อมูลตารางเวรทั้งหมด
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      
      for (const scheduleDoc of schedulesSnapshot.docs) {
        const scheduleData = scheduleDoc.data();
        let hasChanges = false;
        
        // ตรวจสอบและกู้คืนข้อมูลในแต่ละวัน
        if (scheduleData.shifts) {
          for (const day in scheduleData.shifts) {
            const dayData = scheduleData.shifts[day];
            
            // ตรวจสอบว่ามีข้อมูลที่อ้างอิงชื่อเก่าหรือไม่
            for (const staffId in dayData) {
              const shiftData = dayData[staffId];
              
              // ถ้าเป็นข้อมูลเวรที่อ้างอิงชื่อ "สุกัญญา" หรือ "วุฒิเดช"
              if (typeof shiftData === 'string' && 
                  (shiftData.includes('สุกัญญา') || shiftData.includes('วุฒิเดช'))) {
                
                // กู้คืนข้อมูลเวรให้เจ้าหน้าที่คนใหม่
                dayData[newStaffId] = shiftData;
                hasChanges = true;
                
                console.log(`🔄 กู้คืนเวรวันที่ ${day}: ${shiftData}`);
              }
            }
          }
          
          // บันทึกข้อมูลที่กู้คืนแล้ว
          if (hasChanges) {
            await setDoc(doc(db, 'schedules', scheduleDoc.id), {
              ...scheduleData,
              updatedAt: new Date().toISOString(),
              restoredStaffId: newStaffId
            });
            console.log(`✅ กู้คืนตารางเวร ${scheduleDoc.id} เรียบร้อย`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการกู้คืนตารางเวร:', error);
    }
  };

  // ฟังก์ชันตรวจสอบข้อมูลแบบละเอียด
  const checkDataIntegrityDetailed = async () => {
    try {
      console.log('🔍 ตรวจสอบความสมบูรณ์ของข้อมูลแบบละเอียด...');
      
      // ตรวจสอบข้อมูลเจ้าหน้าที่
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      console.log('👥 จำนวนเจ้าหน้าที่ในระบบ:', staffSnapshot.size);
      
      // ตรวจสอบข้อมูลตารางเวร
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      console.log('📅 จำนวนตารางเวรในระบบ:', schedulesSnapshot.size);
      
      // แสดงรายละเอียดเจ้าหน้าที่
      const staffList = [];
      staffSnapshot.forEach((doc) => {
        const data = doc.data();
        staffList.push({ id: doc.id, ...data });
        console.log(`👤 ${data.firstName} ${data.lastName} - ${data.position} (ลำดับที่ ${data.order})`);
      });
      
      // ตรวจสอบว่ามีนางสาวสุกัญญา วุฒิเดช หรือไม่
      const hasSukanya = staffList.some(staff => 
        staff.firstName === 'สุกัญญา' && staff.lastName === 'วุฒิเดช'
      );
      
      console.log('🔍 มีนางสาวสุกัญญา วุฒิเดช ในระบบ:', hasSukanya);
      
      // ตรวจสอบข้อมูลตารางเวรที่มีการอ้างอิงชื่อเก่า
      let scheduleReferences = [];
      schedulesSnapshot.forEach((doc) => {
        const scheduleData = doc.data();
        if (scheduleData.shifts) {
          for (const day in scheduleData.shifts) {
            const dayData = scheduleData.shifts[day];
            for (const staffId in dayData) {
              const shiftData = dayData[staffId];
              if (typeof shiftData === 'string' && 
                  (shiftData.includes('สุกัญญา') || shiftData.includes('วุฒิเดช'))) {
                scheduleReferences.push({
                  scheduleId: doc.id,
                  day: day,
                  staffId: staffId,
                  shiftData: shiftData
                });
              }
            }
          }
        }
      });
      
      console.log('📋 ข้อมูลตารางเวรที่อ้างอิงชื่อเก่า:', scheduleReferences);
      
      return {
        staffCount: staffSnapshot.size,
        scheduleCount: schedulesSnapshot.size,
        staffData: staffList,
        hasSukanya: hasSukanya,
        scheduleReferences: scheduleReferences
      };
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2>👥 จัดการเจ้าหน้าที่</h2>
      <p>ระบบจัดการข้อมูลและสิทธิ์ของเจ้าหน้าที่</p>

      {/* สถิติ */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-number">{staffList.length}</div>
          <div className="stat-label">เจ้าหน้าที่ทั้งหมด</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{getPositionCount('พยาบาล')}</div>
          <div className="stat-label">พยาบาล</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{getPositionCount('ผู้ช่วยพยาบาล')}</div>
          <div className="stat-label">ผู้ช่วยพยาบาล</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{getPositionCount('ผู้ช่วยเหลือคนไข้')}</div>
          <div className="stat-label">ผู้ช่วยเหลือคนไข้</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-number">{staffList.filter(s => !s.department).length}</div>
          <div className="stat-label">ไม่มีแผนก</div>
        </div>
      </div>

      {/* ฟิลเตอร์และค้นหา */}
      <div className="controls-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="ค้นหาตามชื่อ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-container">
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="filter-select"
          >
            <option value="all">ทุกตำแหน่ง</option>
            {positions.map(pos => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
        </div>
                 <button
           onClick={() => setShowAddModal(true)}
           className="btn btn-primary add-btn"
         >
           ➕ เพิ่มเจ้าหน้าที่
         </button>
         <button
           onClick={reorderStaff}
           className="btn btn-warning reorder-btn"
         >
           🔄 ปรับลำดับตามรายชื่อ
         </button>
         <button
           onClick={updateExistingStaffDepartments}
           className="btn btn-info update-dept-btn"
           title="อัพเดทแผนกเจ้าหน้าที่ที่มีอยู่แล้วตามลำดับและตำแหน่ง"
         >
           🏢 อัพเดทแผนกเจ้าหน้าที่
         </button>
      </div>

      {/* ตารางเจ้าหน้าที่ */}
      <div className="table-container">
        <table className="staff-table">
                     <thead>
             <tr>
               <th>ลำดับ</th>
               <th>ชื่อ-นามสกุล</th>
               <th>ตำแหน่ง</th>
               <th>แผนก</th>
               <th>สิทธิ์และการดำเนินการ</th>
             </tr>
           </thead>
          <tbody>
            {filteredStaff.map((staff, index) => (
              <tr key={staff.id}>
                <td>{index + 1}</td>
                <td className="staff-name">
                  {staff.firstName} {staff.lastName}
                </td>
                <td>
                  <span 
                    className="position-badge"
                    style={{ backgroundColor: positions.find(p => p.value === staff.position)?.color }}
                  >
                    {staff.position}
                  </span>
                </td>
                <td>
                  <span className="department-badge">
                    {staff.department || 'ไม่ระบุ'}
                  </span>
                </td>
                                                  <td className="permissions-actions">
                   <div className="all-icons">
                     {staff.canEditSchedule && (
                       <span className="permission-icon schedule" title="แก้ไขตารางเวร">📅</span>
                     )}
                     {staff.canAssignTasks && (
                       <span className="permission-icon tasks" title="มอบหมายงาน">📋</span>
                     )}
                     <span
                       onClick={() => openEditModal(staff)}
                       className="permission-icon edit"
                       title="แก้ไข"
                     >
                       ✏️
                     </span>
                     <span
                       onClick={() => handleDeleteStaff(staff.id)}
                       className="permission-icon delete"
                       title="ลบ"
                     >
                       🗑️
                     </span>
                   </div>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStaff.length === 0 && (
          <div className="no-data">
            <p>ไม่พบข้อมูลเจ้าหน้าที่</p>
          </div>
        )}
      </div>

             {/* โมดัลเพิ่มเจ้าหน้าที่ */}
       {showAddModal && (
         <StaffModal
           title="เพิ่มเจ้าหน้าที่ใหม่"
           formData={formData}
           setFormData={setFormData}
           onSubmit={handleAddStaff}
           onClose={() => {
             setShowAddModal(false);
             resetForm();
           }}
           positions={positions}
           departments={departments}
           staffList={staffList}
           currentAdmin={currentAdmin}
         />
       )}

       {/* โมดัลแก้ไขเจ้าหน้าที่ */}
       {showEditModal && (
         <StaffModal
           title="แก้ไขข้อมูลเจ้าหน้าที่"
           formData={formData}
           setFormData={setFormData}
           onSubmit={handleEditStaff}
           onClose={() => {
             setShowEditModal(false);
             setEditingStaff(null);
             resetForm();
           }}
           positions={positions}
           departments={departments}
           staffList={staffList}
           currentAdmin={currentAdmin}
         />
       )}
    </div>
  );
}

// โมดัลสำหรับเพิ่ม/แก้ไขเจ้าหน้าที่
function StaffModal({ title, formData, setFormData, onSubmit, onClose, positions, departments, staffList, currentAdmin }) {
  return (
    <div className="modal">
      <div className="modal-content staff-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>

        <form onSubmit={onSubmit} className="staff-form">
          {/* แถวที่ 1: ชื่อและนามสกุล */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ชื่อ</label>
              <input
                type="text"
                className="form-input"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="ชื่อ"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">นามสกุล</label>
              <input
                type="text"
                className="form-input"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="นามสกุล"
                required
              />
            </div>
          </div>

          {/* แถวที่ 2: ตำแหน่งและแผนก */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ตำแหน่ง</label>
              <select
                className="form-input"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                required
              >
                {positions.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">แผนก</label>
              <select
                className="form-input"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
              >
                <option value="">เลือกแผนก</option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* แถวที่ 3: ลำดับและสิทธิ์ */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ลำดับ</label>
              <select
                className="form-input"
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                required
              >
                {Array.from({ length: staffList.length + 1 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i === staffList.length ? '(ท้ายสุด)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">สิทธิ์การจัดการ</label>
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.canEditSchedule}
                    onChange={(e) => setFormData({...formData, canEditSchedule: e.target.checked})}
                  />
                  <span>แก้ไขตารางเวร</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.canAssignTasks}
                    onChange={(e) => setFormData({...formData, canAssignTasks: e.target.checked})}
                  />
                  <span>มอบหมายงาน</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StaffManagement;
