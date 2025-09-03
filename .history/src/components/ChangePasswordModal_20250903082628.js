import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
      // อัพเดทรหัสผ่านใน Firestore
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          password: newPassword,
          updatedAt: new Date().toISOString(),
          lastPasswordChange: new Date().toISOString()
        });
        
        // อัพเดทข้อมูลใน localStorage
        const updatedUser = { ...currentUser, password: newPassword };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        console.log('✅ บันทึกรหัสผ่านลงใน Firestore สำเร็จ');
        setSuccess('เปลี่ยนรหัสผ่านสำเร็จแล้ว และบันทึกลงฐานข้อมูลเรียบร้อย');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setError('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
             <div className="modal-content" style={{ 
         position: 'relative',
         width: '320px !important',
         minWidth: '320px !important',
         maxWidth: '320px !important'
       }}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="modal-header">
          <h3 className="modal-title">🔐 เปลี่ยนรหัสผ่าน</h3>
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
