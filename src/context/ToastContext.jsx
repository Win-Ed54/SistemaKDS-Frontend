import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

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
    const timeoutMap = timeoutMapRef.current;

    return () => {
      timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.clear();
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
        className="fixed right-4 top-4 z-[9999] flex max-w-[calc(100vw-2rem)] flex-col gap-3 sm:right-5 sm:top-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={`flex min-w-[240px] max-w-[360px] cursor-pointer items-start gap-3 rounded-[1.4rem] border p-4 shadow-2xl backdrop-blur-md transition-all ${
              toast.type === "error"
                ? "border-red-500/30 bg-red-500/15 text-red-50"
                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-50"
            }`}
          >
            <div
              className={`mt-0.5 rounded-2xl p-2 ${
                toast.type === "error" ? "bg-red-500/20 text-red-200" : "bg-emerald-500/20 text-emerald-200"
              }`}
            >
              {toast.type === "error" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                {toast.type === "error" ? "Error" : "Correcto"}
              </p>
              <p className="mt-1 text-sm font-bold break-words">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
