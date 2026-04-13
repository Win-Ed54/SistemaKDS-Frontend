import { createContext, useContext, useState } from "react";

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = generateId(); // Generar un ID único para cada toast

    setToasts((prev) => {
      //Anti-duplicados (importante en tu caso con SignalR)
      const exists = prev.some(t => t.message === message);
      if (exists) return prev;

      return [...prev, { id, message, type }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 9999
      }}>
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
              fontSize: "14px"
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
