import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Armchair,
  Clock3,
  LogOut,
  RefreshCcw,
  Users,
  XCircle,
} from "lucide-react";

import { logout } from "../services/authService";
import { useToast } from "../context/ToastContext";
import {
  getWaiters,
  seatTable,
  transferTableAssignment,
  unseatTable,
} from "../services/api.service";
import ConfirmDialog from "../components/common/ConfirmDialog";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useTables from "../hooks/useTables";

const DEFAULT_CLEANING_MINUTES = 8;
const MAX_HOST_PARTY_SIZE = 10;

const estimateStayMinutes = (partySize) => {
  const size = Number(partySize) || 0;
  if (size <= 2) return 40;
  if (size <= 4) return 55;
  if (size <= 6) return 70;
  return 85;
};

const formatMinutes = (minutes) => {
  const total = Math.max(0, Math.ceil(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
};

const formatCountdown = (targetTime, now) => {
  const diff = Math.max(0, Number(targetTime || 0) - Number(now || 0));
  const totalSeconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getTableAssignment = (table) => {
  const partySize = Number(table.currentPartySize ?? table.CurrentPartySize);
  const occupiedSinceValue = table.occupiedSince ?? table.OccupiedSince;
  const occupiedSince = occupiedSinceValue
    ? new Date(occupiedSinceValue).getTime()
    : null;
  const estimatedDurationMinutes = Number(
    table.estimatedDiningMinutes ?? table.EstimatedDiningMinutes,
  );

  if (!partySize && !occupiedSince && !estimatedDurationMinutes) return null;

  return {
    partySize: partySize || null,
    seatedAt: occupiedSince,
    estimatedDurationMinutes: estimatedDurationMinutes || null,
    notes: table.hostNotes ?? table.HostNotes ?? "",
    assignedByName: table.assignedByName ?? table.AssignedByName ?? "",
  };
};

const getTableCleaning = (table) => {
  const isBeingCleaned = Boolean(
    table.isBeingCleaned ?? table.IsBeingCleaned,
  );
  const cleaningStartedAtValue =
    table.cleaningStartedAt ?? table.CleaningStartedAt;
  const cleaningStartedAt = cleaningStartedAtValue
    ? new Date(cleaningStartedAtValue).getTime()
    : null;
  const estimatedMinutes = Number(
    table.estimatedCleaningMinutes ?? table.EstimatedCleaningMinutes,
  );

  if (!isBeingCleaned && !cleaningStartedAt && !estimatedMinutes) return null;

  return {
    startedAt: cleaningStartedAt,
    estimatedMinutes: estimatedMinutes || DEFAULT_CLEANING_MINUTES,
  };
};

const getAssignmentTimestamp = (table) => {
  const occupiedSinceValue = table.occupiedSince ?? table.OccupiedSince;
  const occupiedSince = occupiedSinceValue
    ? new Date(occupiedSinceValue).getTime()
    : null;

  return Number.isFinite(occupiedSince) ? occupiedSince : null;
};

const compareTablesByArrival = (a, b) => {
  const aAssignedAt = Number(a.assignmentTimestamp || 0);
  const bAssignedAt = Number(b.assignmentTimestamp || 0);
  const aHasAssignment = aAssignedAt > 0;
  const bHasAssignment = bAssignedAt > 0;

  if (aHasAssignment && bHasAssignment && aAssignedAt !== bAssignedAt) {
    return aAssignedAt - bAssignedAt;
  }

  if (aHasAssignment !== bHasAssignment) {
    return aHasAssignment ? -1 : 1;
  }

  return a.number - b.number;
};

const sortTablesByBestFit = (tables, partySize) =>
  [...tables].sort((a, b) => {
    const normalizedPartySize = Number(partySize) || 0;
    const aFit = Math.max(0, (a.capacity || 0) - normalizedPartySize);
    const bFit = Math.max(0, (b.capacity || 0) - normalizedPartySize);

    if (a.capacity >= normalizedPartySize && b.capacity < normalizedPartySize) return -1;
    if (b.capacity >= normalizedPartySize && a.capacity < normalizedPartySize) return 1;
    if (aFit !== bFit) return aFit - bFit;
    return a.number - b.number;
  });

const HOST_STATUS_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "occupied", label: "Ocupadas" },
  { id: "cleaning", label: "Limpieza" },
  { id: "free", label: "Libres" },
];

const HostView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection();
  const { tables } = useTables();
  const { showToast } = useToast();

  const [seatingPartySize, setSeatingPartySize] = useState("2");
  const [seatingNotes, setSeatingNotes] = useState("");
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [assigningTable, setAssigningTable] = useState(null);
  const [cancellingTable, setCancellingTable] = useState(null);
  const [pendingCancelTable, setPendingCancelTable] = useState(null);
  const [reassigningTable, setReassigningTable] = useState(null);
  const [transferSourceTableNumber, setTransferSourceTableNumber] = useState(null);
  const [pendingTransferTarget, setPendingTransferTarget] = useState(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [now, setNow] = useState(() => Date.now());

  const hostName = localStorage.getItem("user_name") || "Host de Turno";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadWaiters = async () => {
      try {
        const data = await getWaiters();
        const waiterList = Array.isArray(data) ? data : [];
        setWaiters(waiterList);
        setSelectedWaiterId((current) => current || waiterList[0]?.id || "");
      } catch (error) {
        console.error("Error al cargar meseros:", error);
        showToast("No se pudo cargar la lista de meseros", "error");
      }
    };

    loadWaiters();
  }, [showToast]);

  const normalizedTables = useMemo(
    () =>
      (Array.isArray(tables) ? tables : [])
        .map((table) => ({
          ...table,
          id: table.id ?? table.Id ?? table.number ?? table.Number,
          number: Number(table.number ?? table.Number),
          name:
            table.name ?? table.Name ?? `Mesa ${table.number ?? table.Number}`,
          capacity: Number(table.capacity ?? table.Capacity ?? 0),
          isOccupied: Boolean(table.isOccupied ?? table.IsOccupied),
          assignedWaiterId: table.assignedWaiterId ?? table.AssignedWaiterId ?? "",
          assignedWaiterName: table.assignedWaiterName ?? table.AssignedWaiterName ?? "",
          assignment: getTableAssignment(table),
          cleaning: getTableCleaning(table),
          assignmentTimestamp: getAssignmentTimestamp(table),
        }))
        .filter((table) => Number.isFinite(table.number))
        .sort((a, b) => a.number - b.number),
    [tables],
  );

  const hostTableStates = useMemo(
    () =>
      normalizedTables.map((table) => {
        const assignment = table.assignment;
        const cleaning = table.cleaning;

        if (cleaning) {
          const availableAt =
            Number(cleaning.startedAt) +
            Number(cleaning.estimatedMinutes || DEFAULT_CLEANING_MINUTES) *
              60 *
              1000;

          return {
            ...table,
            status: "cleaning",
            partySize: assignment?.partySize ?? null,
            availableAt,
            countdown: formatCountdown(availableAt, now),
            remainingMinutes: Math.max(0, (availableAt - now) / 60000),
          };
        }

        if (table.isOccupied || assignment) {
          const partySize = Number(assignment?.partySize) || table.capacity || 4;
          const estimatedDurationMinutes =
            Number(assignment?.estimatedDurationMinutes) ||
            estimateStayMinutes(partySize);
          const seatedAt = Number(assignment?.seatedAt) || now;
          const diningEndsAt =
            seatedAt + estimatedDurationMinutes * 60 * 1000;
          const availableAt =
            diningEndsAt + DEFAULT_CLEANING_MINUTES * 60 * 1000;

          return {
            ...table,
            status: "occupied",
            partySize,
            availableAt,
            countdown: formatCountdown(diningEndsAt, now),
            remainingMinutes: Math.max(0, (diningEndsAt - now) / 60000),
          };
        }

        return {
          ...table,
          status: "free",
          partySize: null,
          availableAt: now,
          countdown: "Libre",
          remainingMinutes: 0,
        };
      }).sort((a, b) => {
        const statusPriority = {
          occupied: 0,
          cleaning: 1,
          free: 2,
        };

        const priorityDiff =
          (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);

        if (priorityDiff !== 0) return priorityDiff;

        if (a.status === "occupied") return compareTablesByArrival(a, b);

        return a.number - b.number;
      }),
    [normalizedTables, now],
  );

  const availableTables = useMemo(
    () => hostTableStates.filter((table) => table.status === "free"),
    [hostTableStates],
  );

  const suggestedTables = useMemo(() => {
    return sortTablesByBestFit(availableTables, seatingPartySize);
  }, [availableTables, seatingPartySize]);

  const nextTableToFree = useMemo(
    () =>
      hostTableStates
        .filter((table) => table.status !== "free")
        .sort((a, b) => a.availableAt - b.availableAt)[0],
    [hostTableStates],
  );

  const diningTablesCount = useMemo(
    () => hostTableStates.filter((table) => table.status === "occupied").length,
    [hostTableStates],
  );

  const cleaningTablesCount = useMemo(
    () => hostTableStates.filter((table) => table.status === "cleaning").length,
    [hostTableStates],
  );

  const filteredHostTableStates = useMemo(
    () =>
      activeStatusFilter === "all"
        ? hostTableStates
        : hostTableStates.filter((table) => table.status === activeStatusFilter),
    [activeStatusFilter, hostTableStates],
  );

  const waiterTableAssignments = useMemo(() => {
    const assignmentsByWaiter = waiters.map((waiter) => ({
      id: waiter.id,
      username: waiter.username,
      activeTables: 0,
      occupiedTables: 0,
      cleaningTables: 0,
    }));

    const waiterMap = new Map(
      assignmentsByWaiter.map((waiter) => [String(waiter.id || "").trim(), waiter]),
    );

    hostTableStates.forEach((table) => {
      const assignedWaiterId = String(table.assignedWaiterId || "").trim();
      const assignedWaiterName = String(table.assignedWaiterName || "").trim().toLowerCase();

      const waiter =
        waiterMap.get(assignedWaiterId) ||
        assignmentsByWaiter.find(
          (item) => String(item.username || "").trim().toLowerCase() === assignedWaiterName,
        );

      if (!waiter) return;
      if (table.status !== "occupied" && table.status !== "cleaning") return;

      waiter.activeTables += 1;

      if (table.status === "occupied") waiter.occupiedTables += 1;
      if (table.status === "cleaning") waiter.cleaningTables += 1;
    });

    return assignmentsByWaiter.sort((a, b) => {
      if (b.activeTables !== a.activeTables) return b.activeTables - a.activeTables;
      return a.username.localeCompare(b.username);
    });
  }, [hostTableStates, waiters]);

  useEffect(() => {
    if (!transferSourceTableNumber) return;

    const sourceTable = hostTableStates.find(
      (table) => table.number === transferSourceTableNumber,
    );

    if (!sourceTable || sourceTable.status !== "occupied") {
      setTransferSourceTableNumber(null);
      setPendingTransferTarget(null);
    }
  }, [hostTableStates, transferSourceTableNumber]);

  const handleSeatPartySizeChange = (event) => {
    const value = String(event.target.value || "").replace(/\D/g, "").slice(0, 2);
    const normalized = Number(value || 0);

    if (!value) {
      setSeatingPartySize("");
      return;
    }

    setSeatingPartySize(String(Math.min(MAX_HOST_PARTY_SIZE, Math.max(1, normalized))));
  };

  const getWaiterForSeating = (preferredWaiterId = "") =>
    waiters.find((waiter) => waiter.id === preferredWaiterId) ||
    waiters.find((waiter) => waiter.id === selectedWaiterId) ||
    null;

  const seatGuestsAtTable = async (table, options = {}) => {
    const partySize = Number(options.partySize ?? seatingPartySize);
    const notes = String(options.notes ?? seatingNotes).trim();
    const assignedWaiter = getWaiterForSeating(options.assignedWaiterId);

    if (!partySize || partySize < 1) {
      showToast("Ingresa la cantidad de comensales", "error");
      return false;
    }

    if (partySize > MAX_HOST_PARTY_SIZE) {
      showToast(`Solo se permiten de 1 a ${MAX_HOST_PARTY_SIZE} comensales por asignacion`, "error");
      return false;
    }

    if (!assignedWaiter) {
      showToast("Selecciona el mesero que atendera la mesa", "error");
      return false;
    }

    if (table.capacity && partySize > table.capacity) {
      showToast(`Mesa ${table.number} admite maximo ${table.capacity}`, "error");
      return false;
    }

    try {
      setAssigningTable(table.number);
      await seatTable(table.number, {
        partySize,
        estimatedDiningMinutes: estimateStayMinutes(partySize),
        notes,
        assignedWaiterId: assignedWaiter.id,
        assignedWaiterName: assignedWaiter.username,
      });
      showToast(
        `Mesa ${table.number} asignada a ${assignedWaiter.username}.`,
        "success",
      );
      setSeatingNotes("");
      return true;
    } catch (error) {
      console.error("Error al asignar mesa:", error);
      showToast(
        error?.message || `No se pudo asignar la mesa ${table.number}`,
        "error",
      );
      return false;
    } finally {
      setAssigningTable(null);
    }
  };

  const handleSeatGuests = async (table) => {
    await seatGuestsAtTable(table);
  };

  const handleCancelAssignment = async (table) => {
    try {
      setCancellingTable(table.number);
      await unseatTable(table.number);
      if (transferSourceTableNumber === table.number) {
        setTransferSourceTableNumber(null);
      }
      setPendingCancelTable(null);
      showToast(`Mesa ${table.number} cancelada correctamente.`, "success");
    } catch (error) {
      console.error("Error al cancelar asignacion:", error);
      showToast(
        error?.message || `No se pudo cancelar la mesa ${table.number}`,
        "error",
      );
    } finally {
      setCancellingTable(null);
    }
  };

  const selectedWaiter = useMemo(
    () => waiters.find((waiter) => waiter.id === selectedWaiterId) || null,
    [selectedWaiterId, waiters],
  );

  const handlePrepareTransfer = (table) => {
    setTransferSourceTableNumber(table.number);
    setSeatingPartySize(String(table.partySize || ""));
    setSeatingNotes(table.assignment?.notes || "");
    setSelectedWaiterId((current) => table.assignedWaiterId || current);
    showToast(
      `Selecciona una mesa libre para mover la asignacion de mesa ${table.number}.`,
      "success",
    );
  };

  const handleTransferAssignment = async (targetTable) => {
    if (!transferSourceTableNumber) return;

    try {
      setReassigningTable(targetTable.number);
      await transferTableAssignment(transferSourceTableNumber, targetTable.number);
      showToast(
        `Mesa ${transferSourceTableNumber} movida a mesa ${targetTable.number}.`,
        "success",
      );
      setTransferSourceTableNumber(null);
      setPendingTransferTarget(null);
    } catch (error) {
      console.error("Error al reubicar mesa:", error);
      showToast(
        error?.message ||
          `No se pudo mover la mesa ${transferSourceTableNumber} a mesa ${targetTable.number}`,
        "error",
      );
    } finally {
      setReassigningTable(null);
    }
  };

  const handleRequestTransferConfirmation = (targetTable) => {
    if (!transferSourceTableNumber) return;
    setPendingTransferTarget(targetTable.number);
  };

  const handleCloseTransferModal = () => {
    if (reassigningTable !== null) return;
    setPendingTransferTarget(null);
  };

  const confirmTransferTable = useMemo(
    () =>
      hostTableStates.find(
        (table) => table.number === Number(pendingTransferTarget),
      ) ?? null,
    [hostTableStates, pendingTransferTarget],
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white selection:bg-cyan-400/30">
      <ConfirmDialog
        open={pendingCancelTable !== null}
        title="Cancelar asignacion de mesa"
        description={
          pendingCancelTable !== null
            ? `Se liberara la mesa ${pendingCancelTable.number} si todavia no tiene ordenes activas.`
            : ""
        }
        confirmLabel="Cancelar mesa"
        cancelLabel="Volver"
        tone="warning"
        loading={cancellingTable !== null}
        onConfirm={() => (pendingCancelTable ? handleCancelAssignment(pendingCancelTable) : undefined)}
        onCancel={() => {
          if (cancellingTable !== null) return;
          setPendingCancelTable(null);
        }}
      />

      <header className="sticky top-0 z-50 px-3 pt-3 lg:px-6 lg:pt-6 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto rounded-[2rem] border border-slate-800 bg-slate-900/85 shadow-2xl p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Armchair className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tighter uppercase leading-none">
                  KDS <span className="text-cyan-400">Host</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.28em] mt-1">
                  Recepcion: {hostName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  isConnected
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : "border-red-500/20 bg-red-950/20 text-red-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isConnected ? "En linea" : "Sin conexion"}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Cerrar sesion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 pb-10 pt-4 lg:px-6 space-y-5">
        <SurfaceHeader
          eyebrow="Recepcion"
          title="Sala de espera y asignacion de mesas"
          badge={`${availableTables.length} libres`}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Mesas libres" value={availableTables.length} accent="text-emerald-300" />
          <MetricCard label="Mesas ocupadas" value={diningTablesCount} accent="text-amber-300" />
          <MetricCard label="En limpieza" value={cleaningTablesCount} accent="text-cyan-300" />
          <MetricCard
            label="Proxima liberacion"
            value={
              nextTableToFree
                ? `M${nextTableToFree.number} ${formatMinutes(nextTableToFree.remainingMinutes)}`
                : "Libre"
            }
            accent="text-white"
          />
        </div>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                Carga de meseros
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tighter uppercase text-white">
                Mesas asignadas por mesero
              </h2>
            </div>
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              {waiterTableAssignments.reduce((total, waiter) => total + waiter.activeTables, 0)} mesas activas
            </div>
          </div>

          {waiterTableAssignments.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                No hay meseros cargados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {waiterTableAssignments.map((waiter) => (
                <article
                  key={waiter.id}
                  className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Mesero
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase tracking-[0.12em] text-white">
                    {waiter.username}
                  </h3>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-[1rem] border border-cyan-500/20 bg-cyan-500/10 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                        Total
                      </p>
                      <p className="mt-2 text-xl font-black text-cyan-200">
                        {waiter.activeTables}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
                        Ocupadas
                      </p>
                      <p className="mt-2 text-xl font-black text-amber-200">
                        {waiter.occupiedTables}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-emerald-500/20 bg-emerald-500/10 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                        Limpieza
                      </p>
                      <p className="mt-2 text-xl font-black text-emerald-200">
                        {waiter.cleaningTables}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <section className="xl:col-span-4 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                Nueva asignacion
              </p>
              <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                El host recibe y asigna
              </h2>
            </div>

            <StepCard
              step="1"
              title="Comensales"
              subtitle="El mesero se encarga luego de la orden y limpieza"
            >
              <input
                type="number"
                value={seatingPartySize}
                onChange={handleSeatPartySizeChange}
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-", "."].includes(event.key)) {
                    event.preventDefault();
                    return;
                  }

                  if (event.key === "Enter" && suggestedTables[0] && selectedWaiter) {
                    event.preventDefault();
                    if (transferSourceTableNumber) {
                      handleRequestTransferConfirmation(suggestedTables[0]);
                      return;
                    }
                    void handleSeatGuests(suggestedTables[0]);
                  }
                }}
                min="1"
                max={MAX_HOST_PARTY_SIZE}
                inputMode="numeric"
                className="w-full border-2 rounded-[1.4rem] p-4 font-black text-2xl bg-slate-950 border-slate-800 text-[#FFFF00] focus:border-[#FFFF00] outline-none"
              />
            </StepCard>

            <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Mesero asignado
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {waiters.length > 0
                  ? `${waiters.length} meseros disponibles`
                  : "Sin meseros cargados"}
              </p>
              <select
                value={selectedWaiterId}
                onChange={(event) => setSelectedWaiterId(event.target.value)}
                className="mt-4 w-full rounded-[1.2rem] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="" className="text-slate-500">
                  Selecciona mesero
                </option>
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.username}
                  </option>
                ))}
              </select>
              {selectedWaiter ? (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  Atendera: {selectedWaiter.username}
                </p>
              ) : (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  Selecciona un mesero antes de asignar
                </p>
              )}
            </div>

            <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Nota de espera
              </p>
              <textarea
                value={seatingNotes}
                onChange={(event) => setSeatingNotes(event.target.value.slice(0, 80))}
                rows={3}
                placeholder="Ej. silla para bebe, aniversario, ventana"
                className="mt-4 w-full rounded-[1.2rem] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <div className="rounded-[1.8rem] border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Mejor ajuste
              </p>
              <p className="text-lg font-black text-white mt-2">
                {suggestedTables[0]
                  ? `Mesa ${suggestedTables[0].number} · ${suggestedTables[0].capacity} pax`
                  : "Sin mesas libres"}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300 mt-2">
                Estadia esperada: {formatMinutes(estimateStayMinutes(seatingPartySize))}
              </p>
              {suggestedTables[0] && (
                <button
                  type="button"
                  onClick={() =>
                    transferSourceTableNumber
                      ? handleRequestTransferConfirmation(suggestedTables[0])
                      : handleSeatGuests(suggestedTables[0])
                  }
                  disabled={
                    !selectedWaiter ||
                    assigningTable === suggestedTables[0].number ||
                    reassigningTable === suggestedTables[0].number
                  }
                  className="mt-4 w-full py-3 rounded-[1.2rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-50"
                >
                  {assigningTable === suggestedTables[0].number ||
                  reassigningTable === suggestedTables[0].number
                    ? "Asignando..."
                    : !selectedWaiter
                      ? "Selecciona mesero"
                    : transferSourceTableNumber
                      ? `Mover a mesa ${suggestedTables[0].number}`
                      : `Elegir mesa ${suggestedTables[0].number}`}
                </button>
              )}
            </div>

            {transferSourceTableNumber && (
              <div className="rounded-[1.8rem] border border-amber-400/20 bg-amber-400/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Reubicando mesa
                </p>
                <p className="text-lg font-black text-white mt-2">
                  Seleccion actual: mesa {transferSourceTableNumber}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300 mt-2">
                  Elige una mesa libre para mover la asignacion o cancela este modo.
                </p>
                <button
                  type="button"
                  onClick={() => setTransferSourceTableNumber(null)}
                  className="mt-4 w-full py-3 rounded-[1.2rem] border border-amber-300/30 text-amber-200 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-amber-300/10 transition-all"
                >
                  Cancelar reubicacion
                </button>
              </div>
            )}

            {availableTables.length === 0 && nextTableToFree && (
              <div className="rounded-[1.8rem] border border-amber-400/20 bg-amber-400/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Sala llena
                </p>
                <p className="text-lg font-black text-white mt-2">
                  Mesa {nextTableToFree.number} sera la proxima
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300 mt-2">
                  Disponible aprox. en {formatMinutes(nextTableToFree.remainingMinutes)}
                </p>
              </div>
            )}
          </section>

          <section className="xl:col-span-8 rounded-[2rem] border border-slate-800 bg-slate-900/50 p-5 shadow-xl">
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                    Salon
                  </p>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                    Estado actual de las mesas
                  </h2>
                </div>
                <div className="px-4 py-2 rounded-full border border-slate-800 bg-slate-950 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  {filteredHostTableStates.length} visibles
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {HOST_STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveStatusFilter(filter.id)}
                    className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                      activeStatusFilter === filter.id
                        ? "border-cyan-300 bg-cyan-400 text-slate-950"
                        : "border-slate-800 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredHostTableStates.length === 0 ? (
              <div className="rounded-[1.8rem] border border-dashed border-slate-800 bg-slate-950/50 p-12 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  No hay mesas para este filtro
                </p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  Cambia el estado seleccionado para ver otra parte del salon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredHostTableStates.map((table) => (
                  <HostTableCard
                    key={table.number}
                    table={table}
                    loading={assigningTable === table.number}
                    cancelling={cancellingTable === table.number}
                    reassigning={reassigningTable === table.number}
                    transferSourceTableNumber={transferSourceTableNumber}
                    canSeat={!selectedWaiter}
                    onSeatGuests={handleSeatGuests}
                    onCancelAssignment={setPendingCancelTable}
                    onPrepareTransfer={handlePrepareTransfer}
                    onTransferAssignment={handleRequestTransferConfirmation}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {transferSourceTableNumber && confirmTransferTable && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
              Confirmar reubicacion
            </p>
            <h3 className="text-2xl font-black tracking-tighter uppercase text-white mt-3">
              Mesa {transferSourceTableNumber} a mesa {confirmTransferTable.number}
            </h3>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-3">
              La asignacion del host se movera a la nueva mesa antes de que el mesero tome orden.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Mesa actual
                </p>
                <p className="text-3xl font-black text-white mt-2">
                  {transferSourceTableNumber}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Mesa nueva
                </p>
                <p className="text-3xl font-black text-white mt-2">
                  {confirmTransferTable.number}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseTransferModal}
                disabled={reassigningTable !== null}
                className="flex-1 py-4 rounded-[1.4rem] border border-slate-700 bg-slate-950 text-slate-300 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleTransferAssignment(confirmTransferTable)}
                disabled={reassigningTable !== null}
                className="flex-1 py-4 rounded-[1.4rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                {reassigningTable !== null ? "Moviendo..." : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, accent }) => (
  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/75 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
      {label}
    </p>
    <p className={`text-2xl sm:text-3xl font-black mt-3 ${accent}`}>{value}</p>
  </div>
);

const StepCard = ({ step, title, subtitle, children }) => (
  <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4 md:p-5">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-black flex items-center justify-center shrink-0">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">
          {title}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mt-1">
          {subtitle}
        </p>
      </div>
    </div>
    {children}
  </div>
);

const SurfaceHeader = ({ eyebrow, title, badge }) => (
  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
        {title}
      </h2>
    </div>
    <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em]">
      {badge}
    </div>
  </div>
);

const HostStatusPill = ({ status }) => {
  const config = {
    free: {
      text: "Libre",
      className: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    },
    occupied: {
      text: "Ocupada",
      className: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    },
    cleaning: {
      text: "Limpiando",
      className: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    },
  };

  const current = config[status] || config.free;

  return (
    <span className={`text-[9px] font-black uppercase px-3 py-2 rounded-full border ${current.className}`}>
      {current.text}
    </span>
  );
};

const HostTableCard = ({
  table,
  loading,
  cancelling,
  reassigning,
  transferSourceTableNumber,
  canSeat,
  onSeatGuests,
  onCancelAssignment,
  onPrepareTransfer,
  onTransferAssignment,
}) => {
  const isFree = table.status === "free";
  const isTransferSource = transferSourceTableNumber === table.number;
  const isTransferMode = transferSourceTableNumber !== null && transferSourceTableNumber !== undefined;
  const timeLabel =
    table.status === "occupied"
      ? `Comida termina en ${table.countdown}`
      : table.status === "cleaning"
        ? `Limpieza termina en ${table.countdown}`
        : "Disponible ahora";

  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Mesa
          </p>
          <p className="text-3xl font-black text-white mt-2 leading-none">
            {table.number}
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mt-2">
            Capacidad {table.capacity || "-"} pax
          </p>
        </div>
        <HostStatusPill status={table.status} />
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-4 h-4" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Grupo</p>
          </div>
          <p className="text-sm font-black uppercase text-slate-100 mt-2">
            {table.partySize ? `${table.partySize} comensales` : "Sin asignar"}
          </p>
          {!!table.assignedWaiterName && (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mt-2">
              Mesero: {table.assignedWaiterName}
            </p>
          )}
          {!!table.assignment?.notes && (
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              {table.assignment.notes}
            </p>
          )}
        </div>

        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock3 className="w-4 h-4" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Estimado</p>
          </div>
          <p className="text-sm font-black uppercase text-slate-100 mt-2">
            {timeLabel}
          </p>
          {!isFree && (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mt-2">
              Libre aprox. en {formatMinutes(table.remainingMinutes)}
            </p>
          )}
        </div>

        {isFree ? (
          <button
            onClick={() =>
              isTransferMode ? onTransferAssignment(table) : onSeatGuests(table)
            }
            disabled={canSeat || loading || reassigning}
            className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50"
          >
            {canSeat
              ? "Selecciona mesero"
              : loading || reassigning
              ? "Asignando..."
              : isTransferMode
                ? "Mover asignacion aqui"
                : "Ubicar comensales"}
          </button>
        ) : table.status === "occupied" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onPrepareTransfer(table)}
              disabled={isTransferSource}
              className="w-full py-4 rounded-[1.4rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              {isTransferSource ? "Mesa seleccionada" : "Elegir otra mesa"}
            </button>
            <button
              type="button"
              onClick={() => onCancelAssignment(table)}
              disabled={cancelling}
              className="w-full py-4 rounded-[1.4rem] border border-red-500/30 bg-red-500/10 text-red-200 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-red-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? "Cancelando..." : "Cancelar mesa"}
            </button>
            <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Disponible mientras la mesa no tenga ordenes activas
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              El mesero asignado continua el flujo
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostView;

