import React, { useMemo, useState } from "react";
import { BadgePlus, Copy, KeyRound, Mail, Power, RotateCcw, UserPlus2 } from "lucide-react";
import { createUser, resetUserPassword, updateUserStatus } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "cashier", label: "Caja" },
  { value: "host", label: "Host" },
  { value: "kitchen", label: "Cocina" },
  { value: "waiter", label: "Mesero" },
];

const SERVICE_SCOPE_OPTIONS = [
  { value: "hybrid", label: "Mixto" },
  { value: "dining", label: "Solo mesas" },
  { value: "takeout", label: "Solo para llevar" },
];

const EMPTY_FORM = {
  username: "",
  fullName: "",
  email: "",
  role: "waiter",
  serviceScope: "hybrid",
  isDemoAccount: false,
};

const copyTextFallback = (value) => {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
};

const UserCreationPanel = ({ users = [], onCreated }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState("");
  const [resettingUserId, setResettingUserId] = useState("");

  const demoUsers = useMemo(
    () => (Array.isArray(users) ? users.filter((user) => user?.isDemoAccount) : []),
    [users],
  );

  const sortedUsers = useMemo(
    () =>
      [...(Array.isArray(users) ? users : [])].sort((a, b) =>
        String(a?.username || "").localeCompare(String(b?.username || "")),
      ),
    [users],
  );

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "role" && value !== "waiter" ? { serviceScope: "hybrid" } : null),
    }));
  };

  const copyCredentials = async () => {
    if (!createdResult) return;

    const lines = [
      `Usuario: ${createdResult.username}`,
      createdResult.temporaryPassword ? `Contrasena temporal: ${createdResult.temporaryPassword}` : "Acceso demo sin contrasena",
      `Rol: ${createdResult.role}`,
      `Alcance: ${createdResult.serviceScope}`,
    ];
    const textToCopy = lines.join("\n");

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        showToast("Credenciales copiadas", "success");
        return;
      }

      const copied = copyTextFallback(textToCopy);
      showToast(
        copied ? "Credenciales copiadas" : "No se pudo copiar al portapapeles",
        copied ? "success" : "error",
      );
    } catch {
      const copied = copyTextFallback(textToCopy);
      showToast(
        copied ? "Credenciales copiadas" : "No se pudo copiar al portapapeles",
        copied ? "success" : "error",
      );
    }
  };

  const handleSubmit = async () => {
    if (!form.username.trim()) {
      showToast("El usuario es obligatorio", "error");
      return;
    }

    setSaving(true);
    setCreatedResult(null);

    try {
      const payload = {
        username: form.username.trim(),
        fullName: form.fullName.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
        serviceScope: form.role === "waiter" ? form.serviceScope : "hybrid",
        isDemoAccount: form.isDemoAccount,
      };

      const result = await createUser(payload);
      setCreatedResult(result);
      setForm(EMPTY_FORM);
      showToast(
        result.isDemoAccount
          ? "Usuario demo creado. Puede entrar solo con su usuario."
          : "Usuario creado con contrasena temporal.",
        "success",
      );
      onCreated?.();
    } catch (error) {
      showToast(error?.message || "No se pudo crear el usuario", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const userId = user?.id || user?._id || "";
    if (!userId) return;

    setTogglingUserId(userId);
    try {
      await updateUserStatus(userId, !(user?.isActive !== false));
      showToast(
        user?.isActive !== false ? "Usuario desactivado" : "Usuario reactivado",
        "success",
      );
      onCreated?.();
    } catch (error) {
      showToast(error?.message || "No se pudo actualizar el estado del usuario", "error");
    } finally {
      setTogglingUserId("");
    }
  };

  const handleResetPassword = async (user) => {
    const userId = user?.id || user?._id || "";
    if (!userId) return;

    setResettingUserId(userId);
    try {
      const result = await resetUserPassword(userId);
      setCreatedResult({
        username: result.username,
        role: user?.role || "",
        serviceScope: user?.serviceScope || "hybrid",
        temporaryPassword: result.temporaryPassword,
        isDemoAccount: false,
      });
      showToast("Contrasena temporal regenerada", "success");
      onCreated?.();
    } catch (error) {
      showToast(error?.message || "No se pudo reiniciar la contrasena", "error");
    } finally {
      setResettingUserId("");
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            Accesos
          </p>
          <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
            Crear usuarios y pruebas
          </h2>
        </div>
        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
          {demoUsers.length} usuarios demo
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="Usuario"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Nombre completo"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Correo"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none md:col-span-2"
            />
            <select
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={form.serviceScope}
              onChange={(event) => updateField("serviceScope", event.target.value)}
              disabled={form.role !== "waiter"}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
            >
              {SERVICE_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.isDemoAccount}
              onChange={(event) => updateField("isDemoAccount", event.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Cuenta demo: entra solo con usuario y no exige cambio de contrasena.
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
          >
            <UserPlus2 className="h-4 w-4" />
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <BadgePlus className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                Ultimo acceso creado
              </p>
            </div>

            {createdResult ? (
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <p><strong>Usuario:</strong> {createdResult.username}</p>
                <p><strong>Rol:</strong> {createdResult.role}</p>
                <p><strong>Alcance:</strong> {createdResult.serviceScope}</p>
                {createdResult.temporaryPassword ? (
                  <p><strong>Contrasena temporal:</strong> {createdResult.temporaryPassword}</p>
                ) : (
                  <p>Cuenta demo sin contrasena.</p>
                )}
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200"
                >
                  <Copy className="h-4 w-4" />
                  Copiar credenciales
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Cuando crees un usuario aqui veras sus credenciales temporales o su acceso demo.
              </p>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-amber-300">
              <KeyRound className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                Recomendado
              </p>
            </div>
            <ul className="mt-4 space-y-2">
              <li>Usa cuentas demo para mostrar pantallas sin entregar contrasenas reales.</li>
              <li>Usa correo solo en cuentas reales para luego enviar activacion.</li>
              <li>Cuentas reales fuerzan cambio de contrasena al primer ingreso.</li>
            </ul>
          </div>

          <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-emerald-300">
              <Mail className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                Siguiente paso
              </p>
            </div>
            <p className="mt-4">
              El campo correo ya queda guardado para conectar el envio automatico de credenciales sin cambiar este flujo.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Gestion rapida
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-white">
              Usuarios creados en el sistema
            </p>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
            {sortedUsers.length} registrados
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sortedUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500">
              Cuando cargues usuarios, aqui podras activarlos, desactivarlos y regenerar accesos.
            </div>
          ) : (
            sortedUsers.map((user) => {
              const userId = user?.id || user?._id || "";
              const isActive = user?.isActive !== false;
              const isDemoAccount = Boolean(user?.isDemoAccount);
              const isProtectedManager = Boolean(user?.isProtectedManager);

              return (
                <div key={userId} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                        {user?.username}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                          {user?.role || "sin rol"}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                          {user?.serviceScope || "hybrid"}
                        </span>
                        <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${
                          isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/20 bg-red-500/10 text-red-300"
                        }`}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                        {isDemoAccount ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
                            Demo
                          </span>
                        ) : null}
                        {isProtectedManager ? (
                          <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-300">
                            Gerencia protegida
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={togglingUserId === userId || isProtectedManager}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] disabled:opacity-60 ${
                          isActive
                            ? "border border-red-500/20 bg-red-500/10 text-red-300"
                            : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        }`}
                        title={isProtectedManager ? "La cuenta de gerencia no puede desactivarse desde este panel." : ""}
                      >
                        <Power className="h-4 w-4" />
                        {isProtectedManager
                          ? "Protegido"
                          : togglingUserId === userId
                          ? "Guardando..."
                          : isActive
                            ? "Desactivar"
                            : "Reactivar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetPassword(user)}
                        disabled={resettingUserId === userId || isProtectedManager}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 disabled:opacity-60"
                        title={isProtectedManager ? "La cuenta de gerencia no permite contrasena temporal desde este panel." : ""}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {isProtectedManager
                          ? "No aplica"
                          : resettingUserId === userId
                            ? "Generando..."
                            : "Nueva temporal"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default UserCreationPanel;
