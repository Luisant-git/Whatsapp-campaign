import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const showSuccess = (message) => showToast(message, 'success');
  const showError = (message) => showToast(message, 'error');
  const showInfo = (message) => showToast(message, 'info');

  const showConfirm = (message, onConfirm) => {
    return new Promise((resolve) => {
      setConfirmModal({
        message,
        onConfirm: () => {
          setConfirmModal(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        }
      });
    });
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showConfirm }}>
      {children}
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-message toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <XCircle size={20} />}
          {toast.type === 'info' && <AlertCircle size={20} />}
          {toast.message}
        </div>
      ))}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-content">
              <AlertCircle size={24} className="confirm-icon" />
              <p>{confirmModal.message}</p>
            </div>
            <div className="confirm-actions">
              <button onClick={confirmModal.onCancel} className="btn-secondary">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className="btn-danger">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};