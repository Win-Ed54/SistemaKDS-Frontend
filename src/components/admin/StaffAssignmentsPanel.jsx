import React, { useMemo, useState } from "react";
import { ShieldCheck, UserCog, UtensilsCrossed, Wallet, ChefHat, Armchair, ChevronDown } from "lucide-react";
import { updateUserServiceScope } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const ROLE_META = {
  admin: { label: "Admin", icon: ShieldCheck, tone: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10" },
  host: { label: "Host", icon: Armchair, tone: "text-amber-300 border-amber-500/20 bg-amber-500/10" },
  waiter: { label: "Mesero", icon: UserCog, tone: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10" },
  kitchen: { label: "Cocina", icon: ChefHat, tone: "text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/10" },
  cashier: { label: "Caja", icon: Wallet, tone: "text-sky-300 border-sky-500/20 bg-sky-500/10" },
};

const SERVICE_SCOPE_OPTIONS = [
  { value: "dining", label: "Solo mesas" },
  { value: "takeout", label: "Solo para llevar" },
  { value: "hybrid", label: "Mixto" },
];

const normalizeServiceScope = (value) => {
  const normalized = String(value || "hybrid").trim().toLowerCase();
  return SERVICE_SCOPE_OPTIONS.some((option) => option.value === normalized) ? normalized : "hybrid";
};

const getServiceScopeLabel = (value) =>
  SERVICE_SCOPE_OPTIONS.find((option) => option.value === normalizeServiceScope(value))?.label || "Mixto";

const StaffAssignmentsPanel = ({ users = [], onUpdated }) => {
  const { showToast } = useToast();
  const [savingUsers, setSavingUsers] = useState({});
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const takeoutWaiterId = useMemo(() => {
    const waiterUsers = (Array.isArray(users) ? users : []).filter(
      (user) => String(user?.role || "").trim().toLowerCase() === "waiter",
    );

    return (
      waiterUsers.find((user) => normalizeServiceScope(user?.serviceScope) === "takeout")?.id || ""
    );
  }, [users]);

  const connectedCount = useMemo(
    () => (Array.isArray(users) ? users.filter((user) => user?.isConnected !== false).length : 0),
    [users],
  );

  const groupedUsers = useMemo(() => {
    const groups = new Map();

    (Array.isArray(users) ? users : []).forEach((user) => {
      const role = String(user?.role || "").trim().toLowerCase() || "otro";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role).push(user);
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [users]);

  const [collapsed, setCollapsed] = useState(() => ({}));

  const toggleCollapsed = (role) => {
    setCollapsed((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const handleScopeChange = async (userId, serviceScope) => {
    try {
      setSavingUsers((prev) => ({ ...prev, [userId]: true }));
      await updateUserServiceScope(userId, serviceScope);
      showToast(
        serviceScope === "takeout"
          ? "Perfil para llevar asignado. Los demas meseros pasan a solo mesas."
          : "Alcance de servicio actualizado",
        "success",
      );
      onUpdated?.();
    } catch (error) {
      showToast(error?.message || "No se pudo actualizar el alcance", "error");
    } finally {
      setSavingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            Equipo
          </p>
          <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
            Perfiles y alcance de servicio
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            {users.length} perfiles disponibles
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            {connectedCount} conectados
          </div>
            <button
              type="button"
              onClick={() => setPanelCollapsed((v) => !v)}
              className="ml-2 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 hover:bg-slate-900/70"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${panelCollapsed ? "rotate-180" : "rotate-0"}`} />
              <span>{panelCollapsed ? "Abrir" : "Ocultar"}</span>
            </button>
        </div>
      </div>

      {!panelCollapsed && <div className="mt-5 space-y-5">
        {groupedUsers.map(([role, roleUsers]) => {
          const meta = ROLE_META[role] || ROLE_META.waiter;
          const Icon = meta.icon || UtensilsCrossed;

          const isCollapsed = Boolean(collapsed[role]);

          return (
            <div key={role} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl border px-3 py-3 ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {meta.label}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {roleUsers.length} perfil{roleUsers.length === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(role)}
                    aria-expanded={!isCollapsed}
                    className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 hover:bg-slate-900/70"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : "rotate-0"}`} />
                    <span>{isCollapsed ? "Abrir" : "Ocultar"}</span>
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {roleUsers.map((user) => {
                    const normalizedUserScope = normalizeServiceScope(user.serviceScope);
                    const disableTakeoutOption =
                      Boolean(takeoutWaiterId) &&
                      takeoutWaiterId !== user.id &&
                      normalizedUserScope !== "takeout";

                    return (
                    <div key={user.id} className="rounded-[1.4rem] border border-slate-800 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.14em] text-white">
                            {user.username}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                            {meta.label}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${
                              user?.isConnected === false
                                ? "border-red-400/20 bg-red-400/10 text-red-300"
                                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            }`}
                          >
                            {user?.isConnected === false ? "Desconectado" : "Conectado"}
                          </span>
                          {role === "waiter" && (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                              {getServiceScopeLabel(user.serviceScope)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                        <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5">
                          Navegador: {user?.browser || "Desconocido"}
                        </span>
                        {user?.lastSeenAt ? (
                          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5">
                            Ultima vez: {new Date(user.lastSeenAt).toLocaleString("es-SV")}
                          </span>
                        ) : null}
                      </div>

                      {role === "waiter" ? (
                        <div className="mt-4">
                          <label className="block">
                            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                              Alcance del mesero
                            </span>
                            <select
                              value={normalizedUserScope}
                              onChange={(event) => handleScopeChange(user.id, event.target.value)}
                              disabled={Boolean(savingUsers[user.id])}
                              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-black uppercase text-white outline-none disabled:opacity-60"
                            >
                              {SERVICE_SCOPE_OPTIONS.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  disabled={option.value === "takeout" && disableTakeoutOption}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {disableTakeoutOption ? (
                              <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">
                                Ya existe un mesero asignado a para llevar.
                              </span>
                            ) : null}
                          </label>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Perfil operativo listo para respaldo
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </section>
  );
};

export default StaffAssignmentsPanel;
