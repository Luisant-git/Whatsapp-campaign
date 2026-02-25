import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);        // all pending toasts
  const [current, setCurrent] = useState(null);  // toast being shown
  const [confirmModal, setConfirmModal] = useState(null);

  // Add toast to queue
  const showToast = (message, type = "success") => {
    const toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      message,
      type,
    };
    setQueue((prev) => [...prev, toast]);
  };

  const showSuccess = (message) => showToast(message, "success");
  const showError   = (message) => showToast(message, "error");
  const showInfo    = (message) => showToast(message, "info");

  const clearToasts = () => {
    setQueue([]);
    setCurrent(null);
  };

  // When there is no current toast, take one from the queue
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue, current]);

  // Auto-hide current toast after 3 seconds
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setCurrent(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [current]);

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
        },
      });
    });
  };

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showInfo, showConfirm, clearToasts }}
    >
      {children}

      {/* Only ONE toast rendered at a time */}
      {current && (
        <div className={`toast-message toast-${current.type}`}>
          {current.type === "success" && <CheckCircle size={20} />}
          {current.type === "error"   && <XCircle size={20} />}
          {current.type === "info"    && <AlertCircle size={20} />}
          {current.message}
        </div>
      )}

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