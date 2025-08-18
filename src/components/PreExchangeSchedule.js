import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './PreExchangeSchedule.css';

function PreExchangeSchedule({ user }) {
  const [savedSchedules, setSavedSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลดไฟล์รูปตารางเวรที่บันทึกไว้
  useEffect(() => {
    loadSavedSchedules();
  }, []);

  const loadSavedSchedules = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'savedSchedules'));
      const schedules = [];
      querySnapshot.forEach((doc) => {
        schedules.push({ id: doc.id, ...doc.data() });
      });
      
      // เรียงลำดับตามวันที่บันทึก (ใหม่สุดก่อน)
      schedules.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setSavedSchedules(schedules);
    } catch (error) {
      console.error('Error loading saved schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (window.confirm('คุณต้องการลบไฟล์นี้หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'savedSchedules', scheduleId));
        setSavedSchedules(prev => prev.filter(s => s.id !== scheduleId));
        alert('ลบไฟล์เรียบร้อยแล้ว');
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('เกิดข้อผิดพลาดในการลบไฟล์');
      }
    }
  };

  const downloadImage = (imageData, imageUrl, fileName) => {
    if (imageData) {
      // ดาวน์โหลด Base64 image
      const link = document.createElement('a');
      link.href = imageData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (imageUrl) {
      // ดาวน์โหลด URL image (สำหรับข้อมูลเก่า)
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="pre-exchange-schedule">
        <div className="loading-spinner">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="pre-exchange-schedule">
      {savedSchedules.length === 0 ? (
        <div className="no-schedules">
          <div className="no-schedules-icon">📋</div>
          <h3>ไม่มีไฟล์ตารางเวรที่บันทึกไว้</h3>
          <p>แอดมินจะบันทึกตารางเวรเป็นรูปภาพเพื่อให้เจ้าหน้าที่ดูได้</p>
        </div>
      ) : (
        <div className="schedules-grid">
          {savedSchedules.map((schedule) => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-image">
                <img 
                  src={schedule.imageData || schedule.imageUrl} 
                  alt={`ตารางเวร ${schedule.month}/${schedule.year}`}
                  onClick={() => {
                    if (schedule.imageData) {
                      // เปิด Base64 image ในแท็บใหม่
                      const newWindow = window.open();
                      newWindow.document.write(`
                        <html>
                          <head><title>ตารางเวร ${schedule.month}/${schedule.year}</title></head>
                          <body style="margin:0;padding:20px;background:#f5f5f5;">
                            <img src="${schedule.imageData}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
                          </body>
                        </html>
                      `);
                    } else {
                      window.open(schedule.imageUrl, '_blank');
                    }
                  }}
                />
              </div>
              <div className="schedule-info">
                <h4>📅 {schedule.month}/{schedule.year}</h4>
                <p>👥 {schedule.staffType}</p>
                <p>📊 {schedule.totalStaff} คน</p>
                <p>💾 บันทึกเมื่อ: {new Date(schedule.savedAt).toLocaleDateString('th-TH')}</p>
                <p>⏰ {new Date(schedule.savedAt).toLocaleTimeString('th-TH')}</p>
              </div>
              <div className="schedule-actions">
                <button
                  onClick={() => downloadImage(schedule.imageData, schedule.imageUrl, `ตารางเวร_${schedule.month}_${schedule.year}.png`)}
                  className="btn btn-primary"
                  title="ดาวน์โหลด"
                >
                  📥 ดาวน์โหลด
                </button>
                <button
                  onClick={() => {
                    if (schedule.imageData) {
                      // เปิด Base64 image ในแท็บใหม่
                      const newWindow = window.open();
                      newWindow.document.write(`
                        <html>
                          <head><title>ตารางเวร ${schedule.month}/${schedule.year}</title></head>
                          <body style="margin:0;padding:20px;background:#f5f5f5;">
                            <img src="${schedule.imageData}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
                          </body>
                        </html>
                      `);
                    } else {
                      window.open(schedule.imageUrl, '_blank');
                    }
                  }}
                  className="btn btn-info"
                  title="ดูขนาดเต็ม"
                >
                  👁️ ดูขนาดเต็ม
                </button>
                {user?.role === 'admin' ? (
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="btn btn-danger"
                    title="ลบ (เฉพาะแอดมิน)"
                  >
                    🗑️ ลบ
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    disabled={true}
                    title="ลบ (เฉพาะแอดมิน)"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    🗑️ ลบ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PreExchangeSchedule;
