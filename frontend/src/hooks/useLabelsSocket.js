import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/config';

export const useLabelsSocket = (userId, onLabelUpdate, onManualEdit) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(API_BASE_URL.replace('/api', ''), {
      query: { userId },
      withCredentials: true,
    });

    socket.on('labelUpdate', ({ phone, labels }) => {
      onLabelUpdate(phone, labels);
    });

    socket.on('manualEdit', ({ phone }) => {
      onManualEdit(phone);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return socketRef.current;
};
