import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp,
  Armchair,
  Clock3,
  RefreshCcw,
  Users,
  XCircle,
} from "lucide-react";

import { logout } from "../services/authService";
import { useToast } from "../context/ToastContext";
import { getAuthValue } from "../services/authStorage";
import {
  getWaiters,
  seatTable,
  transferTableAssignment,
  unseatTable,
} from "../services/api.service";
import ConfirmDialog from "../components/common/ConfirmDialog";
import useKdsSettings from "../hooks/useKdsSettings";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useTables from "../hooks/useTables";
import { sanitizeSafeFreeText } from "../utils/inputSanitizers";
import { readViewState, writeViewState } from "../utils/viewStateStorage";
import ModuleHeader from "../components/common/ModuleHeader";

const DEFAULT_CLEANING_MINUTES = 8;

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

const hasRealTableServiceState = (table) => {
  const isBeingCleaned = Boolean(table.isBeingCleaned ?? table.IsBeingCleaned);
  if (isBeingCleaned) return true;

  const partySize = Number(table.currentPartySize ?? table.CurrentPartySize ?? 0);
  if (partySize > 0) return true;

  const assignmentTimestamp = getAssignmentTimestamp(table);
  if (Number.isFinite(assignmentTimestamp) && assignmentTimestamp > 0) return true;

  const assignedWaiterId = String(table.assignedWaiterId ?? table.AssignedWaiterId ?? "").trim();
  const assignedWaiterName = String(table.assignedWaiterName ?? table.AssignedWaiterName ?? "").trim();

  return Boolean(assignedWaiterId || assignedWaiterName);
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
    const normalizedPartySize = Math.max(1, Number(partySize) || 0);
    const aFit = Math.max(0, (a.capacity || 0) - normalizedPartySize);
    const bFit = Math.max(0, (b.capacity || 0) - normalizedPartySize);

    if (aFit !== bFit) return aFit - bFit;
    if ((a.capacity || 0) !== (b.capacity || 0)) return (a.capacity || 0) - (b.capacity || 0);
    return a.number - b.number;
  });

const HOST_STATUS_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "occupied", label: "Ocupadas" },
  { id: "cleaning", label: "Limpieza" },
  { id: "free", label: "Libres" },
];

const normalizeWaiter = (waiter) => {
  if (!waiter || typeof waiter !== "object") return null;

  const id = String(
    waiter.id ?? waiter.Id ?? waiter._id ?? waiter.userId ?? waiter.UserId ?? "",
  ).trim();
  const username = String(
    waiter.username ?? waiter.Username ?? waiter.name ?? waiter.Name ?? "",
  ).trim();
  const role = String(waiter.role ?? waiter.Role ?? "waiter").trim().toLowerCase();
  const serviceScope = String(
    waiter.serviceScope ?? waiter.ServiceScope ?? "hybrid",
  ).trim().toLowerCase();
  const browser = String(waiter.browser ?? waiter.Browser ?? "Desconocido").trim() || "Desconocido";

  if (!id || !username) return null;
  if (role && role !== "waiter") return null;

  return {
    ...waiter,
    id,
    username,
    role,
    serviceScope,
    browser,
    isConnected: waiter.isConnected ?? waiter.IsConnected ?? true,
  };
};

const HostView = () => {
  const navigate = useNavigate();
  const { isConnected, connection } = useSignalRConnection("host");
  const { tables, refetch: refetchTables } = useTables();
  const { settings } = useKdsSettings();
  const { showToast } = useToast();

  const hostName = getAuthValue("user_name") || "Host de Turno";
  const [seatingPartySize, setSeatingPartySize] = useState(() =>
    readViewState("host", hostName, "seatingPartySize", "2"),
  );
  const [seatingNotes, setSeatingNotes] = useState("");
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState(() =>
    readViewState("host", hostName, "selectedWaiterId", ""),
  );
  const [assigningTable, setAssigningTable] = useState(null);
  const [cancellingTable, setCancellingTable] = useState(null);
  const [pendingCancelTable, setPendingCancelTable] = useState(null);
  const [reassigningTable, setReassigningTable] = useState(null);
  const [transferSourceTableNumber, setTransferSourceTableNumber] = useState(null);
  const [pendingTransferTarget, setPendingTransferTarget] = useState(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState(() =>
    readViewState("host", hostName, "activeStatusFilter", "all"),
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const maxHostPartySize = Number(settings?.maxPartySize) > 0 ? Number(settings.maxPartySize) : 10;
  const maxTablesPerWaiter = Number(settings?.maxTablesPerWaiter) > 0
    ? Number(settings.maxTablesPerWaiter)
    : 5;
  const defaultCleaningMinutes =
    Number(settings?.defaultCleaningMinutes) > 0
      ? Number(settings.defaultCleaningMinutes)
      : DEFAULT_CLEANING_MINUTES;
  const requireConnectedWaitersForAssignment =
    settings?.requireConnectedWaitersForAssignment !== false;
  const connectedWaitersCount = waiters.filter((waiter) => waiter.isConnected !== false).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateVisibility = () => setShowBackToTop(window.scrollY > 260);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  useEffect(() => {
    writeViewState("host", hostName, "seatingPartySize", seatingPartySize);
  }, [hostName, seatingPartySize]);

  useEffect(() => {
    writeViewState("host", hostName, "selectedWaiterId", selectedWaiterId);
  }, [hostName, selectedWaiterId]);

  useEffect(() => {
    writeViewState("host", hostName, "activeStatusFilter", activeStatusFilter);
  }, [activeStatusFilter, hostName]);

  const loadWaiters = useCallback(async () => {
    try {
      const data = await getWaiters();
      const waiterList = (Array.isArray(data) ? data : [])
        .map(normalizeWaiter)
        .filter(Boolean)
        .sort((a, b) => a.username.localeCompare(b.username));
      setWaiters(waiterList);
      setSelectedWaiterId((current) =>
        waiterList.some((waiter) => waiter.id === current)
          ? current
          : "",
      );
    } catch (error) {
      console.error("Error al cargar meseros:", error);
      showToast("No se pudo cargar la lista de meseros", "error");
    }
  }, [showToast]);

  useEffect(() => {
    void loadWaiters();
  }, [loadWaiters]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadWaiters();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadWaiters();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadWaiters]);

  useEffect(() => {
    if (isConnected) {
      void loadWaiters();
    }
  }, [isConnected, loadWaiters]);

  useEffect(() => {
    if (!connection) return;

    const handlePresenceUpdated = () => {
      void loadWaiters();
    };
    const handleStaffUpdated = () => {
      void loadWaiters();
    };

    connection.on("presenceupdated", handlePresenceUpdated);
    connection.on("staffupdated", handleStaffUpdated);
    connection.on("StaffUpdated", handleStaffUpdated);

    return () => {
      connection.off("presenceupdated", handlePresenceUpdated);
      connection.off("staffupdated", handleStaffUpdated);
      connection.off("StaffUpdated", handleStaffUpdated);
    };
  }, [connection, loadWaiters]);

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
          isOccupied: Boolean(table.isOccupied ?? table.IsOccupied) && hasRealTableServiceState(table),
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
            Number(cleaning.estimatedMinutes || defaultCleaningMinutes) *
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

        if (table.isOccupied) {
          const partySize = Number(assignment?.partySize) || table.capacity || 4;
          const estimatedDurationMinutes =
            Number(assignment?.estimatedDurationMinutes) ||
            estimateStayMinutes(partySize);
          const seatedAt = Number(assignment?.seatedAt) || now;
          const diningEndsAt =
            seatedAt + estimatedDurationMinutes * 60 * 1000;
          const calculatedAvailableAt =
            diningEndsAt + defaultCleaningMinutes * 60 * 1000;

          return {
            ...table,
            status: "occupied",
            partySize,
            availableAt: calculatedAvailableAt,
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
    [defaultCleaningMinutes, normalizedTables, now],
  );

  const availableTables = useMemo(
    () => hostTableStates.filter((table) => table.status === "free"),
    [hostTableStates],
  );

  const fittingAvailableTables = useMemo(() => {
    const normalizedPartySize = Math.max(1, Number(seatingPartySize) || 0);
    return availableTables.filter(
      (table) => !table.capacity || Number(table.capacity) >= normalizedPartySize,
    );
  }, [availableTables, seatingPartySize]);

  const suggestedTables = useMemo(
    () => sortTablesByBestFit(fittingAvailableTables, seatingPartySize),
    [fittingAvailableTables, seatingPartySize],
  );

  const nextTableToFree = useMemo(
    () =>
      hostTableStates
        .filter((table) => {
          if (table.status === "free") return false;
          const normalizedPartySize = Math.max(1, Number(seatingPartySize) || 0);
          return !table.capacity || Number(table.capacity) >= normalizedPartySize;
        })
        .sort((a, b) => a.availableAt - b.availableAt)[0],
    [hostTableStates, seatingPartySize],
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
      isConnected: waiter.isConnected !== false,
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

  const selectableWaiters = useMemo(
    () =>
      requireConnectedWaitersForAssignment
        ? waiters.filter((waiter) => waiter.isConnected !== false)
        : waiters,
    [requireConnectedWaitersForAssignment, waiters],
  );

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

    setSeatingPartySize(String(Math.min(maxHostPartySize, Math.max(1, normalized))));
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

    if (partySize > maxHostPartySize) {
      showToast(`Solo se permiten de 1 a ${maxHostPartySize} comensales por asignacion`, "error");
      return false;
    }

    if (!assignedWaiter) {
      showToast("Selecciona el mesero que atendera la mesa", "error");
      return false;
    }

    if (
      requireConnectedWaitersForAssignment &&
      assignedWaiter.isConnected === false
    ) {
      showToast("El mesero seleccionado no esta conectado. Elige otro mesero activo.", "error");
      return false;
    }

    if (table.capacity && partySize > table.capacity) {
      showToast(`Mesa ${table.number} admite maximo ${table.capacity}`, "error");
      return false;
    }

    const currentAssignments = hostTableStates.filter(
      (entry) =>
        String(entry.assignedWaiterId || "").trim() === String(assignedWaiter.id || "").trim() &&
        (entry.status === "occupied" || entry.status === "cleaning"),
    ).length;

    if (currentAssignments >= maxTablesPerWaiter) {
      showToast(
        `El mesero ${assignedWaiter.username} ya alcanzo el limite de ${maxTablesPerWaiter} mesas activas.`,
        "error",
      );
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
      window.dispatchEvent(new Event("kds-sync-tables"));
      await refetchTables();
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
      window.dispatchEvent(new Event("kds-sync-tables"));
      await refetchTables();
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

  const selectedWaiterAssignments = useMemo(
    () =>
      hostTableStates.filter(
        (table) =>
          String(table.assignedWaiterId || "").trim() === String(selectedWaiterId || "").trim() &&
          (table.status === "occupied" || table.status === "cleaning"),
      ).length,
    [hostTableStates, selectedWaiterId],
  );

  const isSelectedWaiterAvailable = requireConnectedWaitersForAssignment
    ? Boolean(selectedWaiter && selectedWaiter.isConnected !== false)
    : Boolean(selectedWaiter);
  const assignmentBlockedReason =
    !selectedWaiter
      ? requireConnectedWaitersForAssignment
        ? "Selecciona un mesero conectado para asignar la mesa."
        : "Selecciona un mesero para asignar la mesa."
      : requireConnectedWaitersForAssignment && !isSelectedWaiterAvailable
        ? "El mesero seleccionado no esta conectado. Elige otro mesero activo."
        : selectedWaiterAssignments >= maxTablesPerWaiter
          ? `El mesero ya alcanzo el limite de ${maxTablesPerWaiter} mesas activas.`
          : "";

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
      window.dispatchEvent(new Event("kds-sync-tables"));
      await refetchTables();
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
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(103,232,249,0.12),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,_#050816_0%,_#0a1525_46%,_#11253a_100%)] text-white selection:bg-cyan-300/30">
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

      <ModuleHeader
        icon={Armchair}
        title="KDS Recepcion"
        subtitle={`Recepcion: ${hostName}`}
        isConnected={isConnected}
        onLogout={handleLogout}
        sticky
        rightContent={(
          <>
            <MetricCard label="Libres" value={availableTables.length} accent="text-emerald-300" />
            <MetricCard label="Ocupadas" value={diningTablesCount} accent="text-amber-300" />
            <MetricCard label="Limpieza" value={cleaningTablesCount} accent="text-cyan-300" />
            <MetricCard
              label="Proxima"
              value={
                nextTableToFree
                  ? `M${nextTableToFree.number} ${formatMinutes(nextTableToFree.remainingMinutes)}`
                  : "Libre"
              }
              accent="text-white"
            />
          </>
        )}
      />

      <main className="max-w-[1600px] mx-auto px-3 pb-10 pt-3 lg:px-5 space-y-5">
        <SurfaceHeader
          eyebrow="Recepcion"
          title="Sala de espera y asignacion de mesas"
          badge={`${connectedWaitersCount}/${waiters.length} meseros conectados`}
        />

        <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/60 p-3 shadow-xl space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Carga de meseros
              </p>
              <h2 className="mt-1 text-sm font-black tracking-[0.12em] uppercase text-white">
                Mesas asignadas por mesero
              </h2>
            </div>
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {waiterTableAssignments.map((waiter) => (
                <article
                  key={waiter.id}
                  className="rounded-[1.1rem] border border-slate-800 bg-slate-950/70 p-3"
                >
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-white truncate">
                    {waiter.username}
                  </h3>

                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(() => {
                      const muted = requireConnectedWaitersForAssignment && waiter.isConnected === false;
                      return (
                        <>
                          <div className={`rounded-[0.8rem] px-2 py-2 ${muted ? 'border border-slate-800 bg-slate-900/30' : 'border border-cyan-500/20 bg-cyan-500/10'}`}>
                            <p className={`text-[7px] font-black uppercase tracking-[0.12em] ${muted ? 'text-slate-500' : 'text-cyan-300'}`}>
                              Total
                            </p>
                            <p className={`mt-1 text-sm font-black ${muted ? 'text-slate-400' : 'text-cyan-200'}`}>
                              {waiter.activeTables}
                            </p>
                          </div>
                          <div className={`rounded-[0.8rem] px-2 py-2 ${muted ? 'border border-slate-800 bg-slate-900/30' : 'border border-amber-500/20 bg-amber-500/10'}`}>
                            <p className={`text-[7px] font-black uppercase tracking-[0.12em] ${muted ? 'text-slate-500' : 'text-amber-300'}`}>
                              Ocupadas
                            </p>
                            <p className={`mt-1 text-sm font-black ${muted ? 'text-slate-400' : 'text-amber-200'}`}>
                              {waiter.occupiedTables}
                            </p>
                          </div>
                          <div className={`rounded-[0.8rem] px-2 py-2 ${muted ? 'border border-slate-800 bg-slate-900/30' : 'border border-emerald-500/20 bg-emerald-500/10'}`}>
                            <p className={`text-[7px] font-black uppercase tracking-[0.12em] ${muted ? 'text-slate-500' : 'text-emerald-300'}`}>
                              Limpieza
                            </p>
                            <p className={`mt-1 text-sm font-black ${muted ? 'text-slate-400' : 'text-emerald-200'}`}>
                              {waiter.cleaningTables}
                            </p>
                          </div>
                        </>
                      );
                    })()}
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
                max={maxHostPartySize}
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
                  ? requireConnectedWaitersForAssignment
                    ? `${selectableWaiters.length} meseros conectados disponibles`
                    : `${selectableWaiters.length} meseros disponibles`
                  : "Sin meseros cargados"}
              </p>
              {!requireConnectedWaitersForAssignment && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  La regla de meseros conectados esta desactivada. Podras asignar a cualquier mesero registrado.
                </p>
              )}
              <select
                value={selectedWaiterId}
                onChange={(event) => setSelectedWaiterId(event.target.value)}
                className="mt-4 w-full rounded-[1.2rem] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="" className="text-slate-500">
                  Selecciona mesero
                </option>
                {selectableWaiters.map((waiter) => (
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
              {selectableWaiters.length === 0 && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  {requireConnectedWaitersForAssignment
                    ? "No hay meseros conectados en este momento."
                    : "No hay meseros cargados en este momento."}
                </p>
              )}
              {selectedWaiter && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                  Estado: {selectedWaiter.isConnected === false ? "Desconectado" : "Conectado"}
                </p>
              )}
              {selectedWaiter && (
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                  Navegador: {selectedWaiter.browser || "Desconocido"}
                </p>
              )}
            </div>

            <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Nota de espera
              </p>
              <textarea
                value={seatingNotes}
                onChange={(event) => setSeatingNotes(sanitizeSafeFreeText(event.target.value, 80))}
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
                  : `Sin mesa libre para ${Math.max(1, Number(seatingPartySize) || 0)} pax`}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300 mt-2">
                Estadia esperada: {formatMinutes(estimateStayMinutes(seatingPartySize))}
              </p>
              {assignmentBlockedReason && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  {assignmentBlockedReason}
                </p>
              )}
              {suggestedTables[0] && (
                <button
                  type="button"
                  onClick={() =>
                    transferSourceTableNumber
                      ? handleRequestTransferConfirmation(suggestedTables[0])
                      : handleSeatGuests(suggestedTables[0])
                  }
                  disabled={
                    Boolean(assignmentBlockedReason) ||
                    assigningTable === suggestedTables[0].number ||
                    reassigningTable === suggestedTables[0].number
                  }
                  className="mt-4 w-full py-3 rounded-[1.2rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-50"
                >
                  {assigningTable === suggestedTables[0].number ||
                  reassigningTable === suggestedTables[0].number
                    ? "Asignando..."
                    : assignmentBlockedReason
                      ? "Bloqueado"
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

            {!suggestedTables[0] && nextTableToFree && (
              <div className="rounded-[1.8rem] border border-amber-400/20 bg-amber-400/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Proxima opcion compatible
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
                    assignmentBlocked={Boolean(assignmentBlockedReason)}
                    assignmentBlockedMessage={assignmentBlockedReason}
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

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-slate-800 bg-slate-950/90 text-cyan-300 shadow-2xl shadow-cyan-950/40"
          aria-label="Subir arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, accent }) => (
  <div className="inline-flex h-9 min-w-[98px] items-center justify-between gap-3 rounded-full border border-slate-800 bg-slate-950/75 px-3">
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className={`text-sm font-black tabular-nums ${accent}`}>{value}</p>
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
  assignmentBlocked,
  assignmentBlockedMessage,
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
            disabled={assignmentBlocked || loading || reassigning}
            className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50"
          >
            {assignmentBlocked
              ? assignmentBlockedMessage || "Bloqueado"
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

