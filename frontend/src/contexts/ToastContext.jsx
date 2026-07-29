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
  const [strongInput, setStrongInput] = useState("");

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
    setStrongInput("");
    return new Promise((resolve) => {
      setConfirmModal({
        message,
        isStrong: false,
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

  const showStrongConfirm = (message, expectedText, onConfirm) => {
    setStrongInput("");
    return new Promise((resolve) => {
      setConfirmModal({
        message,
        isStrong: true,
        expectedText,
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
      value={{ showToast, showSuccess, showError, showInfo, showConfirm, showStrongConfirm, clearToasts }}
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
              <div className="confirm-text-container" style={{ flex: 1 }}>
                <p>{confirmModal.message}</p>
                {confirmModal.isStrong && (
                  <div className="strong-confirm-container" style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: '#555' }}>
                      Type <strong>{confirmModal.expectedText}</strong> to confirm:
                    </p>
                    <input 
                      type="text" 
                      value={strongInput}
                      onChange={(e) => setStrongInput(e.target.value)}
                      placeholder={confirmModal.expectedText}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="confirm-actions">
              <button onClick={confirmModal.onCancel} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className="btn-danger"
                disabled={confirmModal.isStrong && strongInput !== confirmModal.expectedText}
                style={{ 
                  opacity: (confirmModal.isStrong && strongInput !== confirmModal.expectedText) ? 0.5 : 1, 
                  cursor: (confirmModal.isStrong && strongInput !== confirmModal.expectedText) ? 'not-allowed' : 'pointer' 
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};