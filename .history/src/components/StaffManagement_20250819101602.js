import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

  // เพิ่ม state สำหรับหน้าตรวจสอบ
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [deletedStaffList, setDeletedStaffList] = useState([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // เพิ่ม state สำหรับแสดงข้อมูลล็อกอิน
  const [showLoginInfoModal, setShowLoginInfoModal] = useState(false);
  const [staffLoginInfo, setStaffLoginInfo] = useState([]);
  const [loginInfoLoading, setLoginInfoLoading] = useState(false);
  
  // เพิ่ม state สำหรับโมดัลสร้างบัญชี
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(null);
  
  // เพิ่ม state สำหรับการเลื่อนดูข้อมูลล็อกอิน
  const [currentPage, setCurrentPage] = useState(0);
  const [searchLoginTerm, setSearchLoginTerm] = useState('');
  const itemsPerPage = 6;

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

  // ฟังก์ชันเปิดหน้าตรวจสอบ
  const openRecoveryModal = async () => {
    setShowRecoveryModal(true);
    await scanForDeletedStaff();
  };

  // ฟังก์ชันสแกนหาข้อมูลที่โดนลบ
  const scanForDeletedStaff = async () => {
    try {
      setRecoveryLoading(true);
      // console.log('🔍 กำลังสแกนหาข้อมูลที่โดนลบ...');
      
      // ตรวจสอบข้อมูลเจ้าหน้าที่ปัจจุบัน
      const currentStaffSnapshot = await getDocs(collection(db, 'staff'));
      const currentStaffIds = currentStaffSnapshot.docs.map(doc => doc.id);
      
      // ตรวจสอบข้อมูลตารางเวรที่มีการอ้างอิงชื่อเก่า
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      let deletedStaffData = [];
      
      schedulesSnapshot.forEach((doc) => {
        const scheduleData = doc.data();
        if (scheduleData.shifts) {
          for (const day in scheduleData.shifts) {
            const dayData = scheduleData.shifts[day];
            for (const staffId in dayData) {
              const shiftData = dayData[staffId];
              
              // ถ้าเป็นข้อมูลเวรที่อ้างอิงชื่อ (ไม่ใช่ ID)
              if (typeof shiftData === 'string' && 
                  shiftData.includes(' ') && 
                  !currentStaffIds.includes(staffId)) {
                
                // แยกชื่อและนามสกุล
                const nameParts = shiftData.split(' ');
                if (nameParts.length >= 2) {
                  const firstName = nameParts[0];
                  const lastName = nameParts.slice(1).join(' ');
                  
                  // ตรวจสอบว่ามีในรายการแล้วหรือไม่
                  const existingIndex = deletedStaffData.findIndex(
                    staff => staff.firstName === firstName && staff.lastName === lastName
                  );
                  
                  if (existingIndex === -1) {
                    deletedStaffData.push({
                      firstName: firstName,
                      lastName: lastName,
                      scheduleReferences: [{
                        scheduleId: doc.id,
                        day: day,
                        staffId: staffId,
                        shiftData: shiftData
                      }]
                    });
                  } else {
                    deletedStaffData[existingIndex].scheduleReferences.push({
                      scheduleId: doc.id,
                      day: day,
                      staffId: staffId,
                      shiftData: shiftData
                    });
                  }
                }
              }
            }
          }
        }
      });
      
      console.log('📋 พบข้อมูลที่โดนลบ:', deletedStaffData);
      setDeletedStaffList(deletedStaffData);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสแกน:', error);
      alert('เกิดข้อผิดพลาดในการสแกนข้อมูล');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // ฟังก์ชันกู้คืนเจ้าหน้าที่ที่เลือก
  const recoverSelectedStaff = async (staffData) => {
    try {
      setRecoveryLoading(true);
      console.log('🔄 กำลังกู้คืนข้อมูลเจ้าหน้าที่...', staffData);
      
      // ตรวจสอบก่อนว่ามีข้อมูลอยู่แล้วหรือไม่
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const existingStaff = staffSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.firstName === staffData.firstName && data.lastName === staffData.lastName;
      });
      
      if (existingStaff) {
        alert(`✅ ${staffData.firstName} ${staffData.lastName} มีอยู่ในระบบแล้ว!`);
        return;
      }
      
      // สร้างข้อมูลเจ้าหน้าที่ใหม่
      const newStaff = {
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        position: 'ผู้ช่วยพยาบาล', // หรือตำแหน่งที่เหมาะสม
        department: currentAdmin?.department || 'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
        order: staffList.length + 1, // ลำดับท้ายสุด
        canEditSchedule: true,
        canAssignTasks: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // เพิ่มข้อมูลเจ้าหน้าที่กลับเข้าไป
      const staffRef = await addDoc(collection(db, 'staff'), newStaff);
      console.log('✅ เพิ่มเจ้าหน้าที่สำเร็จ ID:', staffRef.id);
      
      // อัพเดท staffList ใน state
      const newStaffWithId = { id: staffRef.id, ...newStaff };
      setStaffList(prev => [...prev, newStaffWithId].sort((a, b) => (a.order || 0) - (b.order || 0)));
      
      // กู้คืนตารางเวรเก่า
      await restoreScheduleDataForStaff(staffRef.id, staffData.scheduleReferences);
      
      // ลบออกจากรายการที่โดนลบ
      setDeletedStaffList(prev => prev.filter(staff => 
        !(staff.firstName === staffData.firstName && staff.lastName === staffData.lastName)
      ));
      
      alert(`กู้คืนข้อมูล${staffData.firstName} ${staffData.lastName} เรียบร้อยแล้ว`);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการกู้คืน:', error);
      alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // ฟังก์ชันกู้คืนข้อมูลตารางเวรสำหรับเจ้าหน้าที่ที่เลือก
  const restoreScheduleDataForStaff = async (newStaffId, scheduleReferences) => {
    try {
      console.log('📅 กำลังกู้คืนข้อมูลตารางเวร...');
      
      for (const reference of scheduleReferences) {
        const scheduleDoc = await getDoc(doc(db, 'schedules', reference.scheduleId));
        if (scheduleDoc.exists()) {
          const scheduleData = scheduleDoc.data();
          
          if (scheduleData.shifts && scheduleData.shifts[reference.day]) {
            // กู้คืนข้อมูลเวร
            scheduleData.shifts[reference.day][newStaffId] = reference.shiftData;
            
            // บันทึกข้อมูลที่กู้คืนแล้ว
            await setDoc(doc(db, 'schedules', reference.scheduleId), {
              ...scheduleData,
              updatedAt: new Date().toISOString(),
              restoredStaffId: newStaffId
            });
            
            console.log(`✅ กู้คืนเวรวันที่ ${reference.day} เรียบร้อย`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการกู้คืนตารางเวร:', error);
    }
  };

  // ฟังก์ชันดึงข้อมูลล็อกอินของเจ้าหน้าที่
  const loadStaffLoginInfo = async () => {
    try {
      setLoginInfoLoading(true);
      console.log('🔐 กำลังดึงข้อมูลล็อกอินของเจ้าหน้าที่...');
      
      // ดึงข้อมูลเจ้าหน้าที่
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const staffData = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // ดึงข้อมูลผู้ใช้ (users collection) - ข้อมูลจริง
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('👥 ข้อมูลเจ้าหน้าที่:', staffData);
      console.log('👤 ข้อมูลผู้ใช้:', usersData);
      
      // รวมข้อมูลเจ้าหน้าที่กับข้อมูลล็อกอิน
      const combinedInfo = staffData.map(staff => {
        // ค้นหาข้อมูลผู้ใช้ที่ตรงกับเจ้าหน้าที่
        let userInfo = null;
        
        // วิธีที่ 1: ค้นหาจาก firstName และ lastName ใน user data (วิธีหลัก)
        userInfo = usersData.find(user => {
          return user.firstName === staff.firstName && user.lastName === staff.lastName;
        });
        
        // วิธีที่ 2: ค้นหาจาก username ที่ตรงกับชื่อ-นามสกุล
        if (!userInfo) {
          userInfo = usersData.find(user => {
            const username = user.username?.toLowerCase() || '';
            const staffName = `${staff.firstName}${staff.lastName}`.toLowerCase().replace(/\s+/g, '');
            return username === staffName;
          });
        }
        
        // วิธีที่ 3: ค้นหาจากชื่อที่คล้ายกัน (แก้ไขปัญหา "ภาณุวัฒน์" vs "นายภาณุวัฒน์")
        if (!userInfo) {
          userInfo = usersData.find(user => {
            const userFirstName = user.firstName?.toLowerCase() || '';
            const userLastName = user.lastName?.toLowerCase() || '';
            const staffFirstName = staff.firstName?.toLowerCase() || '';
            const staffLastName = staff.lastName?.toLowerCase() || '';
            
            // ตรวจสอบชื่อที่คล้ายกัน (ตัดคำนำหน้าออก)
            const cleanUserFirstName = userFirstName.replace(/^(นาย|นาง|นางสาว|ดร\.|อาจารย์)/, '').trim();
            const cleanStaffFirstName = staffFirstName.replace(/^(นาย|นาง|นางสาว|ดร\.|อาจารย์)/, '').trim();
            
            return cleanUserFirstName === cleanStaffFirstName && userLastName === staffLastName;
          });
        }
        
        // วิธีที่ 4: ค้นหาจาก displayName หรือชื่อที่แสดง
        if (!userInfo) {
          userInfo = usersData.find(user => {
            const displayName = user.displayName?.toLowerCase() || '';
            const staffName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
            return displayName === staffName;
          });
        }
        
        // วิธีที่ 5: ค้นหาจาก email ที่ตรงกับชื่อ-นามสกุล (กรณีพิเศษ)
        if (!userInfo) {
          userInfo = usersData.find(user => {
            const userEmail = user.email?.toLowerCase() || '';
            const staffName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
            
            // ตรวจสอบรูปแบบต่างๆ ของ email
            return userEmail.includes(staff.firstName.toLowerCase()) && 
                   userEmail.includes(staff.lastName.toLowerCase());
          });
        }
        
        // วิธีที่ 6: ตรวจสอบชื่อรุ่งจินดาเป็นพิเศษ - ให้เป็นไม่มีบัญชีเสมอ
        if (staff.firstName === 'รุ้งจินดา' && staff.lastName === 'อกอุ่น') {
          userInfo = null;
          console.log('🔒 รุ่งจินดา - บังคับให้เป็นไม่มีบัญชี');
        }
        
        // console.log(`🔍 ค้นหาเจ้าหน้าที่ ${staff.firstName} ${staff.lastName}:`, userInfo);
        
        // แสดงข้อมูล debug เพิ่มเติมสำหรับการจับคู่
        if (!userInfo) {
          console.log(`❌ ไม่พบข้อมูลสำหรับ ${staff.firstName} ${staff.lastName}`);
          console.log('🔍 ข้อมูลที่ค้นหา:', {
            staffFirstName: staff.firstName,
            staffLastName: staff.lastName,
            totalUsers: usersData.length,
            userNames: usersData.map(u => `${u.firstName} ${u.lastName}`)
          });
        } else {
          console.log(`✅ พบข้อมูลสำหรับ ${staff.firstName} ${staff.lastName}:`, {
            userId: userInfo.id,
            username: userInfo.username,
            hasPassword: !!userInfo.password
          });
        }
        

        
        return {
          ...staff,
          username: userInfo?.username || 'ไม่พบข้อมูล',
          password: userInfo?.password || 'ไม่พบข้อมูล',
          lastPasswordChange: userInfo?.lastPasswordChange || userInfo?.metadata?.lastSignInTime || 'ไม่พบข้อมูล',
          userExists: !!userInfo,
          userId: userInfo?.id || null,
          uid: userInfo?.uid || null, // เพิ่ม UID จาก Firebase Auth
          userData: userInfo // เก็บข้อมูลผู้ใช้ทั้งหมดเพื่อ debug
        };
      });
      
      console.log('📋 ข้อมูลล็อกอินของเจ้าหน้าที่:', combinedInfo);
      setStaffLoginInfo(combinedInfo);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลล็อกอิน:', error);
      alert('เกิดข้อผิดพลาดในการดึงข้อมูลล็อกอิน');
    } finally {
      setLoginInfoLoading(false);
    }
  };

  // ฟังก์ชันเปิดหน้าข้อมูลล็อกอิน
  const openLoginInfoModal = async () => {
    setShowLoginInfoModal(true);
    await loadStaffLoginInfo();
  };

  // ฟังก์ชันสร้าง username และ password สำหรับเจ้าหน้าที่ที่ไม่มีบัญชี
  const generateCredentials = (firstName, lastName) => {
    // สร้าง username จากชื่อ-นามสกุล
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/\s+/g, '');
    
    // สร้างรหัสผ่านเริ่มต้น (6 ตัวอักษร)
    const password = Math.random().toString(36).substring(2, 8);
    
    return { username, password };
  };

  // ฟังก์ชันสร้างบัญชีให้เจ้าหน้าที่
  const createAccountForStaff = async (staff) => {
    try {
      // เปิดโมดัลให้แอดมินตั้ง Username และ Password เอง
      setShowCreateAccountModal(true);
      setCreatingStaff(staff);
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสร้างบัญชี:', error);
      alert('เกิดข้อผิดพลาดในการสร้างบัญชี');
    }
  };

  // ฟังก์ชันสร้างบัญชีจริงหลังจากแอดมินตั้งค่าแล้ว
  const handleCreateAccount = async (username, password) => {
    try {
      if (!username || !password) {
        alert('กรุณากรอก Username และ Password');
        return;
      }

      if (username.length < 3) {
        alert('Username ต้องมีอย่างน้อย 3 ตัวอักษร');
        return;
      }

      if (password.length < 6) {
        alert('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }

      // ตรวจสอบว่า Username ซ้ำหรือไม่
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const existingUser = usersSnapshot.docs.find(doc => 
        doc.data().username === username
      );

      if (existingUser) {
        alert('Username นี้มีผู้ใช้งานแล้ว กรุณาเลือก Username อื่น');
        return;
      }

      // สร้างบัญชีใน Firebase Authentication
      const email = `${username}@sa-hos.com`;
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // สร้างข้อมูลผู้ใช้ใน Firestore
        const newUser = {
          username: username,
          firstName: creatingStaff.firstName,
          lastName: creatingStaff.lastName,
          department: creatingStaff.department || currentAdmin?.department || 'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
          position: creatingStaff.position,
          role: 'staff',
          password: password, // เก็บรหัสผ่านเริ่มต้นไว้ใน Firestore
          createdAt: new Date().toISOString(),
          uid: user.uid // เก็บ UID จาก Firebase Auth
        };
        
        // บันทึกข้อมูลใน users collection โดยใช้ UID เป็น document ID
        await setDoc(doc(db, 'users', user.uid), newUser);
        
        // อัพเดทข้อมูลเจ้าหน้าที่ให้มี userId และ uid
        await updateDoc(doc(db, 'staff', creatingStaff.id), {
          userId: user.uid,
          uid: user.uid,
          updatedAt: new Date().toISOString()
        });
        
        alert(`✅ สร้างบัญชีสำเร็จ!\n\nUsername: ${username}\nรหัสผ่าน: ${password}\n\n⚠️ กรุณาบันทึกข้อมูลนี้ไว้และแจ้งเจ้าหน้าที่\n\nเจ้าหน้าที่สามารถล็อกอินได้ด้วย:\nEmail: ${email}\nรหัสผ่าน: ${password}`);
        
        // ปิดโมดัลและรีเซ็ต
        setShowCreateAccountModal(false);
        setCreatingStaff(null);
        
        // รีเฟรชข้อมูล
        await loadStaffLoginInfo();
        
      } catch (authError) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างบัญชีใน Firebase Auth:', authError);
        if (authError.code === 'auth/email-already-in-use') {
          alert('Username นี้มีผู้ใช้งานแล้ว กรุณาเลือก Username อื่น');
        } else {
          alert(`เกิดข้อผิดพลาดในการสร้างบัญชี: ${authError.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสร้างบัญชี:', error);
      alert('เกิดข้อผิดพลาดในการสร้างบัญชี');
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

      {/* ปุ่มควบคุม */}
      <div className="controls-container">
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary add-btn"
          style={{ 
            width: '200px', 
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          ➕ เพิ่มเจ้าหน้าที่
        </button>
        <button
          onClick={openRecoveryModal}
          className="btn btn-warning"
          style={{ 
            width: '200px', 
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          🔍 ตรวจสอบและกู้คืน
        </button>
        
        <button
          onClick={openLoginInfoModal}
          className="btn btn-secondary"
          title="ดูข้อมูล Username และรหัสผ่านของเจ้าหน้าที่"
          style={{ 
            width: '200px', 
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          🔐 ข้อมูลล็อกอิน
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

       {/* โมดัลหน้าตรวจสอบ */}
       {showRecoveryModal && (
         <div className="modal">
           <div className="modal-content recovery-modal" style={{ maxWidth: '800px', width: '90%' }}>
             <button className="modal-close" onClick={() => setShowRecoveryModal(false)}>×</button>
             
             <div className="modal-header">
               <h3 className="modal-title">🔍 ตรวจสอบและกู้คืนข้อมูล</h3>
             </div>

             <div className="modal-body">
               {recoveryLoading ? (
                 <div style={{ textAlign: 'center', padding: '20px' }}>
                   <div>🔄 กำลังสแกนข้อมูล...</div>
                 </div>
               ) : deletedStaffList.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '20px', color: '#28a745' }}>
                   <div>✅ ไม่พบข้อมูลเจ้าหน้าที่ที่หายไป</div>
                   <div style={{ fontSize: '14px', marginTop: '10px' }}>
                     ระบบไม่พบข้อมูลที่ต้องกู้คืน
                   </div>
                 </div>
               ) : (
                 <div>
                   <div style={{ marginBottom: '15px', color: '#856404', fontSize: '14px' }}>
                     พบข้อมูลเจ้าหน้าที่ที่หายไป {deletedStaffList.length} คน
                   </div>
                   
                   {deletedStaffList.map((staff, index) => (
                     <div key={index} style={{ 
                       border: '1px solid #dee2e6', 
                       borderRadius: '8px', 
                       padding: '15px', 
                       marginBottom: '10px',
                       background: '#f8f9fa'
                     }}>
                       <div style={{ 
                         display: 'flex', 
                         justifyContent: 'space-between', 
                         alignItems: 'center',
                         marginBottom: '10px'
                       }}>
                         <div>
                           <strong style={{ fontSize: '16px' }}>
                             {staff.firstName} {staff.lastName}
                           </strong>
                           <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                             พบในตารางเวร {staff.scheduleReferences.length} ครั้ง
                           </div>
                         </div>
                         <button 
                           onClick={() => recoverSelectedStaff(staff)}
                           className="btn btn-success"
                           style={{ fontSize: '12px', padding: '6px 12px' }}
                           disabled={recoveryLoading}
                         >
                           🔄 กู้คืน
                         </button>
                       </div>
                       
                       <div style={{ fontSize: '12px', color: '#6c757d' }}>
                         <strong>ข้อมูลที่พบ:</strong>
                         {staff.scheduleReferences.map((ref, refIndex) => (
                           <div key={refIndex} style={{ marginTop: '5px' }}>
                             • ตารางเวร {ref.scheduleId} วันที่ {ref.day}: {ref.shiftData}
                           </div>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             <div className="modal-footer">
               <button 
                 onClick={() => setShowRecoveryModal(false)} 
                 className="btn btn-secondary"
               >
                 ปิด
               </button>
             </div>
           </div>
         </div>
       )}

       {/* โมดัลข้อมูลล็อกอิน */}
       {showLoginInfoModal && (
         <LoginInfoModal
           onClose={() => setShowLoginInfoModal(false)}
           staffLoginInfo={staffLoginInfo}
           loginInfoLoading={loginInfoLoading}
           onRefresh={loadStaffLoginInfo}
           currentPage={currentPage}
           setCurrentPage={setCurrentPage}
           searchLoginTerm={searchLoginTerm}
           setSearchLoginTerm={setSearchLoginTerm}
           itemsPerPage={itemsPerPage}
           generateCredentials={generateCredentials}
           createAccountForStaff={createAccountForStaff}
         />
       )}

       {/* โมดัลสร้างบัญชี */}
       {showCreateAccountModal && (
         <CreateAccountModal
           staff={creatingStaff}
           onClose={() => {
             setShowCreateAccountModal(false);
             setCreatingStaff(null);
           }}
           onSubmit={handleCreateAccount}
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

// โมดัลข้อมูลล็อกอิน
function LoginInfoModal({ onClose, staffLoginInfo, loginInfoLoading, onRefresh, currentPage, setCurrentPage, searchLoginTerm, setSearchLoginTerm, itemsPerPage, generateCredentials, createAccountForStaff }) {
  // ฟิลเตอร์ข้อมูลตามคำค้นหา
  const filteredData = staffLoginInfo.filter(staff => 
    `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchLoginTerm.toLowerCase()) ||
    staff.position.toLowerCase().includes(searchLoginTerm.toLowerCase()) ||
    staff.username.toLowerCase().includes(searchLoginTerm.toLowerCase())
  );
  
  // คำนวณจำนวนหน้า
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);
  
  // ฟังก์ชันเปลี่ยนหน้า
  const goToPage = (page) => {
    const maxPage = Math.max(0, totalPages - 1);
    setCurrentPage(Math.max(0, Math.min(page, maxPage)));
  };
  
  // รีเซ็ตหน้าเมื่อข้อมูลเปลี่ยน
  React.useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);
  
  return (
    <div className="modal">
      <div className="modal-content login-info-modal" style={{ maxWidth: '1000px', width: '95%' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h3 className="modal-title">🔐 ข้อมูลล็อกอินของเจ้าหน้าที่</h3>
          <div style={{ 
            fontSize: '12px', 
            color: '#6c757d', 
            marginTop: '5px',
            fontWeight: 'normal'
          }}>
            แสดงข้อมูล Username และรหัสผ่านของเจ้าหน้าที่ทั้งหมด
          </div>

        </div>

        <div className="modal-body">
          {loginInfoLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div>🔄 กำลังดึงข้อมูลล็อกอิน...</div>
            </div>
          ) : (
            <div>
              {/* ส่วนค้นหา */}
              <div style={{ 
                marginBottom: '15px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="ค้นหาตามชื่อ, ตำแหน่ง, หรือ username..."
                    value={searchLoginTerm}
                    onChange={(e) => {
                      setSearchLoginTerm(e.target.value);
                      setCurrentPage(0); // รีเซ็ตหน้าเมื่อค้นหา
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={() => {
                      setSearchLoginTerm('');
                      setCurrentPage(0);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    🗑️ ล้าง
                  </button>
                </div>
                <div style={{ color: '#856404', fontSize: '12px' }}>
                  พบข้อมูล {filteredData.length} คน จากทั้งหมด {staffLoginInfo.length} คน
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  marginTop: '10px',
                  fontSize: '12px'
                }}>
                  <div style={{ color: '#28a745' }}>
                    ✅ มีบัญชี: {staffLoginInfo.filter(s => s.userExists).length} คน
                  </div>
                  <div style={{ color: '#856404' }}>
                    ⚠️ ไม่มีบัญชี: {staffLoginInfo.filter(s => !s.userExists).length} คน
                  </div>
                </div>


              </div>
              
              {/* ตารางข้อมูล */}
              <div style={{ overflowX: 'auto' }}>
                {currentData.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#6c757d',
                    fontSize: '14px'
                  }}>
                    <div>📭 ไม่พบข้อมูลในหน้าปัจจุบัน</div>
                  </div>
                ) : (
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>ลำดับ</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>ชื่อ-นามสกุล</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>ตำแหน่ง</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Username</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>รหัสผ่าน</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((staff, index) => (
                      <tr key={staff.id} style={{ 
                        background: staff.userExists ? 'white' : '#fff3cd',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{startIndex + index + 1}</td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                          <strong>{staff.firstName} {staff.lastName}</strong>
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            background: staff.userExists ? '#d4edda' : '#fff3cd',
                            color: staff.userExists ? '#155724' : '#856404'
                          }}>
                            {staff.position}
                          </span>
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6', fontFamily: 'monospace' }}>
                          {staff.userExists ? (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                              {staff.username}
                            </span>
                          ) : (
                            <span style={{ color: '#856404', fontStyle: 'italic' }}>
                              ยังไม่มีข้อมูล
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6', fontFamily: 'monospace' }}>
                          {staff.userExists ? (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                              {staff.password || 'ไม่พบข้อมูล'}
                            </span>
                          ) : (
                            <span style={{ color: '#856404', fontStyle: 'italic' }}>
                              ยังไม่มีข้อมูล
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6', fontFamily: 'monospace' }}>
                          {staff.userExists ? (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                              {staff.username}@sa-hos.com
                            </span>
                          ) : (
                            <span style={{ color: '#856404', fontStyle: 'italic' }}>
                              ยังไม่มีข้อมูล
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px',
                              background: staff.userExists ? '#d4edda' : '#fff3cd',
                              color: staff.userExists ? '#155724' : '#856404'
                            }}>
                              {staff.userExists ? '✅ มีบัญชี' : '⚠️ ไม่มีบัญชี'}
                            </span>
                            {!staff.userExists && (
                              <button
                                onClick={() => createAccountForStaff(staff)}
                                className="btn btn-success"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                title="สร้างบัญชีให้เจ้าหน้าที่คนนี้"
                              >
                                ➕ สร้างบัญชี
                              </button>
                            )}
                            {staff.userData && (
                              <span 
                                style={{ 
                                  fontSize: '10px', 
                                  color: '#6c757d',
                                  cursor: 'pointer'
                                }}
                                title="คลิกเพื่อดูข้อมูล debug"
                                onClick={() => console.log('User data for', staff.firstName, staff.lastName, ':', staff.userData)}
                              >
                                🔍
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
              
              {/* ระบบเลื่อนหน้า */}
              {totalPages > 1 && (
                <div style={{ 
                  marginTop: '15px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => goToPage(0)}
                    disabled={currentPage === 0}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ⏮️ หน้าแรก
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ⬅️ ก่อนหน้า
                  </button>
                  
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    หน้า {currentPage + 1} จาก {totalPages}
                  </span>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ถัดไป ➡️
                  </button>
                  <button
                    onClick={() => goToPage(totalPages - 1)}
                    disabled={currentPage === totalPages - 1}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    หน้าสุดท้าย ⏭️
                  </button>
                </div>
              )}
              
              
            </div>
          )}
        </div>

        <div className="modal-footer">

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={onClose} 
              className="btn btn-secondary"
            >
              ปิด
            </button>
            <button 
              onClick={onRefresh} 
              className="btn btn-primary"
              disabled={loginInfoLoading}
            >
              🔄 รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// โมดัลสร้างบัญชี
function CreateAccountModal({ staff, onClose, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // สร้าง username เริ่มต้นจากชื่อ-นามสกุล
  useEffect(() => {
    if (staff) {
      const defaultUsername = `${staff.firstName.toLowerCase()}${staff.lastName.toLowerCase()}`.replace(/\s+/g, '');
      setUsername(defaultUsername);
    }
  }, [staff]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    
    onSubmit(username, password);
  };

  if (!staff) return null;

  return (
    <div className="modal">
      <div className="modal-content create-account-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h3 className="modal-title">➕ สร้างบัญชีให้เจ้าหน้าที่</h3>
          <div style={{ 
            fontSize: '12px', 
            color: '#28a745', 
            marginTop: '5px',
            fontWeight: 'normal'
          }}>
            บัญชีจะถูกสร้างใน Firebase Authentication และสามารถล็อกอินได้ทันที
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-account-form">
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอก Username"
              required
              minLength={3}
              maxLength={20}
            />
            <div className="form-help-text">
              Username ต้องมีอย่างน้อย 3 ตัวอักษร และไม่ซ้ำกับผู้ใช้อื่น
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">รหัสผ่าน *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                required
                minLength={6}
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6c757d'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="form-help-text">
              รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ยืนยันรหัสผ่าน *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                required
                minLength={6}
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6c757d'
                }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="form-help-text">
              กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              ✅ สร้างบัญชี
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StaffManagement;
