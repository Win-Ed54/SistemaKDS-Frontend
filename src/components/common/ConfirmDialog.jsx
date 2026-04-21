import React, { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

const ConfirmDialog = ({
  open = false,
  title = "Confirmar accion",
  description = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!open || loading) return;
      if (event.key === "Escape") onCancel?.();
      if (event.key === "Enter") onConfirm?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, onConfirm, open]);

  const toneStyles =
    tone === "warning"
      ? {
          accent: "text-amber-300",
          border: "border-amber-400/20",
          surface: "bg-amber-400/10",
          button: "bg-amber-300 text-slate-950 hover:bg-amber-200",
        }
      : {
          accent: "text-red-300",
          border: "border-red-400/20",
          surface: "bg-red-400/10",
          button: "bg-red-500 text-white hover:bg-red-400",
        };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-[2rem] border ${toneStyles.border} bg-slate-900 p-6 shadow-2xl`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl ${toneStyles.surface} p-3`}>
              <AlertTriangle className={`h-5 w-5 ${toneStyles.accent}`} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Confirmacion
              </p>
              <h3 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
                {title}
              </h3>
              {description ? (
                <p className="mt-3 text-sm font-bold text-slate-300">{description}</p>
              ) : null}
            </div>
          </div>

          <button
            onClick={loading ? undefined : onCancel}
            className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition-all hover:text-white"
            aria-label="Cerrar confirmacion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={loading ? undefined : onCancel}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-slate-700 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            onClick={loading ? undefined : onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all disabled:opacity-50 ${toneStyles.button}`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Procesando" : confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
