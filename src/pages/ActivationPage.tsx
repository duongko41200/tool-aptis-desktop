import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setActivated } from '../store/appSlice';
import Icon from '../components/common/Icon';

const LICENSE_KEYS = ["APTIS-VIP-2026", "APTIS-PREMIUM", "APTIS-TIEN-PHONG"];

export default function ActivationPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = key.trim().toUpperCase();
    
    if (LICENSE_KEYS.includes(trimmedKey)) {
      dispatch(setActivated(true));
    } else {
      setError('Mã kích hoạt không hợp lệ. Vui lòng thử lại!');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '24px'
    }}>
      <div style={{
        background: 'rgba(26, 31, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 'var(--r-xl)',
        padding: '40px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 150,
          height: 150,
          background: 'var(--ed-accent)',
          filter: 'blur(80px)',
          opacity: 0.15,
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--ed-accent)',
          color: '#FFF',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 24,
          boxShadow: '0 0 30px rgba(217, 232, 157, 0.4)'
        }}>
          <Icon name="key" size={32} />
        </div>

        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          color: '#fff', 
          marginBottom: 8,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        }}>
          Kích hoạt Bản quyền
        </h1>
        <p style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: 15, 
          marginBottom: 32,
          lineHeight: 1.5
        }}>
          Vui lòng nhập License Key mà bạn đã nhận được khi mua ứng dụng để bắt đầu sử dụng.
        </p>

        <form onSubmit={handleActivate} style={{ width: '100%' }}>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <input
              type="text"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError('');
              }}
              placeholder="VD: APTIS-VIP-2026"
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'rgba(0,0,0,0.3)',
                border: error ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--r-md)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '1px',
                textAlign: 'center',
                outline: 'none',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = 'var(--ed-accent)';
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />
            {error && (
              <div style={{ 
                color: '#ff6b6b', 
                fontSize: 13, 
                marginTop: 8,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}>
                <Icon name="alert-circle" size={14} />
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--ed-accent)',
              color: '#FFF',
              border: 'none',
              borderRadius: 'var(--r-md)',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 20px rgba(217, 232, 157, 0.25)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(217, 232, 157, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(217, 232, 157, 0.25)';
            }}
          >
            KÍCH HOẠT NGAY
            <Icon name="arrow-right" size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
