import { createContext, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());

  const dismissToast = (id) => {
    const existingTimeout = timeoutMapRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutMapRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const scheduleDismiss = (id) => {
    const existingTimeout = timeoutMapRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      timeoutMapRef.current.delete(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);

    timeoutMapRef.current.set(id, timeoutId);
  };

  useEffect(() => {
    return () => {
      timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
    };
  }, []);

  const showToast = (message, type = "success") => {
    let toastId = "";

    setToasts((prev) => {
      const existingToast = prev.find(
        (toast) => toast.message === message && toast.type === type,
      );

      toastId = existingToast?.id || generateId();

      if (existingToast) {
        return prev;
      }

      return [...prev, { id: toastId, message, type }];
    });

    scheduleDismiss(toastId);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "error" ? "#ff4d4f" : "#00c853",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: "8px",
              minWidth: "220px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              fontSize: "14px",
              cursor: "pointer",
            }}
            onClick={() => dismissToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
