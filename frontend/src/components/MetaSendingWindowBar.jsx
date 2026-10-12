import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getSendingWindow } from '../api/whatsapp';

export const WhatsAppIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block', flexShrink: 0 }}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.8 8.09 19.09L7.8 18.92L4.69 19.74L5.52 16.71L5.33 16.41C4.55 15.16 4.14 13.72 4.14 11.91C4.14 7.37 7.84 3.67 12.04 3.67ZM8.78 7.38C8.61 7.38 8.33 7.44 8.1 7.69C7.86 7.94 7.21 8.55 7.21 9.78C7.21 11.02 8.11 12.21 8.24 12.38C8.36 12.55 10.01 15.1 12.53 16.19C14.63 17.09 15.06 16.92 15.52 16.87C15.98 16.83 16.99 16.27 17.2 15.69C17.41 15.1 17.41 14.6 17.35 14.5C17.29 14.4 17.14 14.34 16.91 14.23C16.69 14.11 15.57 13.56 15.37 13.48C15.16 13.41 15.01 13.37 14.86 13.6C14.71 13.82 14.28 14.34 14.15 14.49C14.02 14.64 13.89 14.66 13.66 14.54C13.44 14.43 12.71 14.19 11.84 13.42C11.17 12.82 10.71 12.08 10.59 11.85C10.46 11.63 10.57 11.51 10.69 11.39C10.79 11.29 10.92 11.12 11.04 10.98C11.15 10.84 11.19 10.74 11.27 10.57C11.34 10.4 11.3 10.26 11.25 10.14C11.19 10.02 10.74 8.92 10.55 8.47C10.37 8.03 10.18 8.09 10.05 8.08C9.92 8.08 9.77 8.08 9.62 8.08C9.47 8.08 9.23 8.14 9.02 8.36C8.82 8.59 8.78 8.87 8.78 8.87L8.78 7.38Z" />
  </svg>
);

const MetaSendingWindowBar = ({ style = {} }) => {
  const [windowInfo, setWindowInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      const data = await getSendingWindow();
      if (mounted && data) setWindowInfo(data);
    };
    fetchInfo();
    const timer = setInterval(fetchInfo, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const isOpen = windowInfo ? windowInfo.isWithinWindow : true;
  const currentTime = windowInfo?.currentIstTime;

  return (
    <div
      title="Meta WhatsApp Sending Hours: Messages are only dispatched between 8:00 AM and 8:00 PM IST. Outside this window, campaigns automatically pause and resume at 8:00 AM IST."
      style={{
        background: isOpen ? '#f0fdf4' : '#fffbeb',
        border: isOpen ? '1.5px solid #25D366' : '1.5px solid #f59e0b',
        borderRadius: 10,
        padding: '9px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        boxShadow: isOpen ? '0 2px 6px rgba(37, 211, 102, 0.12)' : '0 2px 6px rgba(245, 158, 11, 0.12)',
        ...style,
      }}
    >
      {/* Left: WhatsApp Accent + Bold Title + Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isOpen ? '#25D366' : '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOpen ? '0 2px 6px rgba(37, 211, 102, 0.4)' : 'none',
            flexShrink: 0,
          }}
        >
          <WhatsAppIcon size={16} color="#ffffff" />
        </div>

        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
          Meta Sending Window:{' '}
          <span style={{ color: isOpen ? '#059669' : '#d97706', fontWeight: 800 }}>
            8:00 AM – 8:00 PM IST
          </span>
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 20,
            background: isOpen ? '#25D366' : '#f59e0b',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: isOpen ? '0 1px 4px rgba(37, 211, 102, 0.35)' : 'none',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
          {isOpen ? 'ACTIVE' : 'NIGHT HOLD (RESUMES 8 AM)'}
        </span>
      </div>

      {/* Right: Live Current IST Clock + Asia/Kolkata Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            background: '#ffffff',
            border: isOpen ? '1px solid #bbf7d0' : '1px solid #fde68a',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 800,
            color: '#334155',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Clock size={13} color={isOpen ? '#059669' : '#d97706'} />
          IST: <span style={{ color: '#0f172a', fontWeight: 800 }}>{currentTime || '08:00 AM'}</span>
        </div>

        <div
          style={{
            background: isOpen ? '#dcfce7' : '#fef3c7',
            border: isOpen ? '1px solid #86efac' : '1px solid #fde68a',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 800,
            color: isOpen ? '#15803d' : '#92400e',
          }}
        >
          Asia/Kolkata
        </div>
      </div>
    </div>
  );
};

export default MetaSendingWindowBar;
