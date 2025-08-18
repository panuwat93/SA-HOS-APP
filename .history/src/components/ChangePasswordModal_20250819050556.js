import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      // อัพเดทรหัสผ่านใน Firebase Auth
      await updatePassword(auth.currentUser, newPassword);
      
      // อัพเดทรหัสผ่านใน Firestore ด้วย
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            password: newPassword,
            updatedAt: new Date().toISOString(),
            lastPasswordChange: new Date().toISOString()
          });
          console.log('✅ บันทึกรหัสผ่านลงใน Firestore สำเร็จ');
        } catch (firestoreError) {
          console.error('❌ เกิดข้อผิดพลาดในการบันทึกลง Firestore:', firestoreError);
          // แจ้งเตือนแต่ไม่หยุดการทำงาน
          alert('⚠️ เปลี่ยนรหัสผ่านสำเร็จ แต่ไม่สามารถบันทึกลงฐานข้อมูลได้ กรุณาติดต่อแอดมิน');
        }
      }
      
      setSuccess('เปลี่ยนรหัสผ่านสำเร็จแล้ว และบันทึกลงฐานข้อมูลเรียบร้อย');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Change password error:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('กรุณาเข้าสู่ระบบใหม่เพื่อเปลี่ยนรหัสผ่าน');
      } else {
        setError('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
             <div className="modal-content" style={{ 
         position: 'relative',
         width: '250px',
         maxWidth: '250px',
         minWidth: '250px'
       }}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="modal-header">
          <h3 className="modal-title">🔐 เปลี่ยนรหัสผ่าน</h3>
          <p style={{ color: '#7f8c8d' }}>
            กรุณากรอกข้อมูลเพื่อเปลี่ยนรหัสผ่าน
          </p>
          <div style={{ 
            fontSize: '11px', 
            color: '#28a745', 
            marginTop: '5px',
            fontStyle: 'italic'
          }}>
            💡 รหัสผ่านจะถูกบันทึกลงฐานข้อมูลเพื่อให้แอดมินสามารถดูได้
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">รหัสผ่านใหม่</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
              required
              style={{ width: '100%', padding: '12px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              required
              style={{ width: '100%', padding: '12px' }}
            />
          </div>

          {error && (
            <div style={{ 
              color: '#e74c3c', 
              backgroundColor: '#fdf2f2', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              color: '#27ae60', 
              backgroundColor: '#f0f9ff', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ 
                flex: 1, 
                padding: '12px 20px',
                fontSize: '16px'
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ 
                flex: 1, 
                padding: '12px 20px',
                fontSize: '16px'
              }}
              disabled={loading}
            >
              {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
