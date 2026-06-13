import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  clearPasswordChangeRequirement,
  getRouteForRole,
  getSession,
  logout,
} from "../services/authService";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [navigate, session]);

  if (!session) return null;

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmacion no coincide.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await changePassword(currentPassword, newPassword);
      clearPasswordChangeRequirement();
      navigate(getRouteForRole(session.role), { replace: true });
    } catch (requestError) {
      setError(requestError?.message || "No se pudo actualizar la contrasena.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
          Seguridad
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-[0.12em]">
          Cambia tu contrasena
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          Tu cuenta necesita reemplazar la contrasena temporal antes de continuar.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Contrasena actual"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Nueva contrasena"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirmar nueva contrasena"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
