import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  ClipboardList,
  LogOut,
  PackageCheck,
  ReceiptText,
  Sparkles,
  User,
  X,
  ChevronLeft,
} from "lucide-react";

import { logout } from "../services/authService";
import { getAuthValue } from "../services/authStorage";
import { useToast } from "../context/ToastContext";
import {
  closeTable,
  getMyWaiterOrdersToday,
  getWaiterSummary,
  startTableCleaning,
} from "../services/api.service";
import useKdsSettings from "../hooks/useKdsSettings";
import useOrderBuilder from "../hooks/useOrderBuilder";
import useProducts from "../hooks/useProducts";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useTables from "../hooks/useTables";
import { onOrderDelivered, onOrderPaid, onOrderReady } from "../services/signalrService";
import useOrderStore from "../store/orderStore";
import OrderPanel from "../components/waiter/OrderPanel";
import ProductList from "../components/waiter/ProductList";
import ReadyOrdersView from "../components/waiter/ReadyOrdersView";
import TableSelector from "../components/waiter/TableSelector";
import WaiterProfile from "../components/waiter/WaiterProfile";

const TABS = [
  { id: "ordenar", label: "Nueva orden", icon: ReceiptText },
  { id: "listas", label: "Entregar", icon: BellRing },
  { id: "limpieza", label: "Limpiar", icon: Sparkles },
  { id: "actividad", label: "Mis ordenes", icon: ClipboardList },
];

const DEFAULT_CLEANING_MINUTES = 8;

const CATEGORY_IMAGE_MAP = {
  Hamburguesas: {
    label: "Hamburguesas de carne",
    image: encodeURI("/assets/images/categoria/hamburguesas.webp"),
  },
  Pollo: {
    label: "Hamburguesas de pollo",
    image: encodeURI("/assets/images/categoria/pollo.webp"),
  },
  "Acompañamientos": {
    label: "Acompañamientos",
    image: encodeURI("/assets/images/categoria/acompañamientos.webp"),
  },
  Acompanamientos: {
    label: "Acompañamientos",
    image: encodeURI("/assets/images/categoria/acompañamientos.webp"),
  },
  Postres: {
    label: "Postres",
    image: encodeURI("/assets/images/categoria/postres.webp"),
  },
  Bebidas: {
    label: "Bebidas",
    image: encodeURI("/assets/images/categoria/bebidas.webp"),
  },
  Ensaladas: {
    label: "Ensaladas",
    image: encodeURI("/assets/images/categoria/ensaladas.webp"),
  },
};

const getOrderLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

const formatOrderCurrency = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);

const formatMinutes = (minutes) => `${Math.max(0, Math.ceil(Number(minutes) || 0))} min`;

const formatCountdown = (targetTime, now) => {
  const diff = Math.max(0, Number(targetTime || 0) - Number(now || 0));
  const totalSeconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getAssignedWaiterName = (table) =>
  table.assignedWaiterName ?? table.AssignedWaiterName ?? "";

const getAssignedWaiterId = (table) =>
  table.assignedWaiterId ?? table.AssignedWaiterId ?? "";

const normalizeCompareValue = (value) => String(value || "").trim().toLowerCase();

const waiterMatchesAssignment = ({
  assignedWaiterId,
  assignedWaiterName,
  waiterId,
  waiterName,
}) => {
  const normalizedAssignedId = String(assignedWaiterId || "").trim();
  const normalizedWaiterId = String(waiterId || "").trim();
  const idMatches =
    normalizedAssignedId.length > 0 &&
    normalizedWaiterId.length > 0 &&
    normalizedAssignedId === normalizedWaiterId;

  const nameMatches =
    normalizeCompareValue(assignedWaiterName).length > 0 &&
    normalizeCompareValue(assignedWaiterName) === normalizeCompareValue(waiterName);

  return idMatches || nameMatches;
};

const getCurrentUserId = () => {
  try {
    const token = getAuthValue("waiter_token") || getAuthValue("token");
    if (!token) return "";

    const payloadPart = token.split(".")[1] || "";
    const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
    const payload = JSON.parse(atob(`${normalizedPayload}${padding}`));
    return (
      payload?.nameid ??
      payload?.sub ??
      payload?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ??
      ""
    );
  } catch {
    return "";
  }
};

const getCleaningState = (table) => {
  const startedAt = table.cleaningStartedAt ?? table.CleaningStartedAt;
  const minutes = table.estimatedCleaningMinutes ?? table.EstimatedCleaningMinutes;
  const isBeingCleaned = table.isBeingCleaned ?? table.IsBeingCleaned;

  if (!isBeingCleaned && !startedAt) return null;

  return {
    startedAt: startedAt ? new Date(startedAt).getTime() : null,
    estimatedMinutes: Number(minutes) || DEFAULT_CLEANING_MINUTES,
  };
};

const getAssignedPartySize = (table) =>
  Number(table.currentPartySize ?? table.CurrentPartySize ?? 0) || 0;

const getAssignmentTimestamp = (table) => {
  const occupiedSinceValue = table.occupiedSince ?? table.OccupiedSince;
  const occupiedSince = occupiedSinceValue
    ? new Date(occupiedSinceValue).getTime()
    : null;

  return Number.isFinite(occupiedSince) ? occupiedSince : null;
};

const compareAssignedTablesByArrival = (a, b) => {
  if (a.number === 0 && b.number !== 0) return -1;
  if (b.number === 0 && a.number !== 0) return 1;

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

const getAssignmentAlertId = (table) => {
  const assignmentTimestamp = Number(table?.assignmentTimestamp || 0);
  return `${Number(table?.number || 0)}-${assignmentTimestamp}`;
};

const getOrderStatusNumber = (status) => {
  if (typeof status === "number") return status;

  const statusMap = {
    pending: 0,
    preparing: 1,
    ready: 2,
    delivered: 3,
    cancelled: 4,
  };

  return statusMap[String(status || "").toLowerCase()] ?? -1;
};

const getOrderStatusConfig = (status) => {
  const statusNumber = getOrderStatusNumber(status);

  switch (statusNumber) {
    case 0:
      return {
        label: "En cola",
        accent: "text-amber-300",
        badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      };
    case 1:
      return {
        label: "En cocina",
        accent: "text-cyan-300",
        badge: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
      };
    case 2:
      return {
        label: "Lista",
        accent: "text-emerald-300",
        badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      };
    case 3:
      return {
        label: "Entregada",
        accent: "text-slate-200",
        badge: "border-slate-700 bg-slate-800 text-slate-200",
      };
    case 4:
      return {
        label: "Cancelada",
        accent: "text-red-300",
        badge: "border-red-400/20 bg-red-400/10 text-red-300",
      };
    default:
      return {
        label: "Sin estado",
        accent: "text-slate-400",
        badge: "border-slate-800 bg-slate-900 text-slate-400",
      };
  }
};

const formatOrderTime = (value) => {
  if (!value) return "--:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function WaiterView() {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection();
  useKdsSettings();
  const { products } = useProducts();
  const { tables } = useTables();
  const { tableId, items, setTable } = useOrderBuilder();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const setOrderStore = useOrderStore((state) => state.setOrders);
  const { showToast } = useToast();

  const [showProfile, setShowProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [activeTab, setActiveTab] = useState("ordenar");
  const [pax, setPax] = useState("");
  const [stats, setStats] = useState({ created: 0, delivered: 0 });
  const [cleanupOrders, setCleanupOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [cleaningTables, setCleaningTables] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [lastAssignedTableAlert, setLastAssignedTableAlert] = useState(null);
  const [assignmentAlerts, setAssignmentAlerts] = useState([]);
  const knownAssignedTableAlertIdsRef = useRef(new Set());

  const waiterName = localStorage.getItem("user_name") || "Mesero de Turno";
  const waiterId = getCurrentUserId();
  const currentUser = { username: waiterName, role: "waiter" };

  const normalizedTables = useMemo(
    () =>
      (Array.isArray(tables) ? tables : []).map((table) => ({
        ...table,
        id: table.id ?? table.Id ?? table.number ?? table.Number,
        number: Number(table.number ?? table.Number),
        name: table.name ?? table.Name ?? `Mesa ${table.number ?? table.Number}`,
        capacity: Number(table.capacity ?? table.Capacity ?? 0),
        isOccupied: Boolean(table.isOccupied ?? table.IsOccupied),
        currentPartySize: getAssignedPartySize(table),
        assignedWaiterId: getAssignedWaiterId(table),
        assignedWaiterName: getAssignedWaiterName(table),
        cleaning: getCleaningState(table),
        assignmentTimestamp: getAssignmentTimestamp(table),
      })),
    [tables],
  );

  const serviceTables = useMemo(
    () =>
      normalizedTables.filter((table) => {
        if (table.number === 0) return true;

        return waiterMatchesAssignment({
          assignedWaiterId: table.assignedWaiterId,
          assignedWaiterName: table.assignedWaiterName,
          waiterId,
          waiterName,
        });
      }).sort(compareAssignedTablesByArrival),
    [normalizedTables, waiterId, waiterName],
  );

  const tableAssignmentByNumber = useMemo(() => {
    const map = new Map();

    normalizedTables.forEach((table) => {
      const tableNumber = Number(table?.number);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;

      map.set(tableNumber, {
        assignmentTimestamp: Number(table?.assignmentTimestamp || 0),
        isOccupied: Boolean(table?.isOccupied),
      });
    });

    return map;
  }, [normalizedTables]);

  const tableOrderSummaryByNumber = useMemo(() => {
    const map = new Map();

    todayOrders.forEach((order) => {
      const tableNumber = Number(order?.tableNumber);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;

      const tableAssignment = tableAssignmentByNumber.get(tableNumber);
      const assignmentTimestamp = Number(tableAssignment?.assignmentTimestamp || 0);
      const isOccupied = Boolean(tableAssignment?.isOccupied);
      const createdAt = new Date(order?.createdAt || 0).getTime();

      // Si la mesa ya fue liberada y reasignada, solo contamos ordenes del ciclo actual.
      if (isOccupied && assignmentTimestamp > 0 && createdAt > 0 && createdAt < assignmentTimestamp) {
        return;
      }

      const current = map.get(tableNumber) || {
        totalOrdersToday: 0,
        activeOrders: 0,
        deliveredOrders: 0,
        readyOrders: 0,
        lastCreatedAt: 0,
      };

      const status = getOrderStatusNumber(order?.status);

      current.totalOrdersToday += 1;
      if ([0, 1, 2].includes(status)) current.activeOrders += 1;
      if (status === 2) current.readyOrders += 1;
      if (status === 3) current.deliveredOrders += 1;
      current.lastCreatedAt = Math.max(current.lastCreatedAt, createdAt || 0);

      map.set(tableNumber, current);
    });

    return map;
  }, [tableAssignmentByNumber, todayOrders]);

  const enrichedServiceTables = useMemo(
    () =>
      serviceTables.map((table) => ({
        ...table,
        orderSummary: tableOrderSummaryByNumber.get(Number(table.number)) || {
          totalOrdersToday: 0,
          activeOrders: 0,
          deliveredOrders: 0,
          readyOrders: 0,
          lastCreatedAt: 0,
        },
      })),
    [serviceTables, tableOrderSummaryByNumber],
  );

  const currentTable = useMemo(
    () => enrichedServiceTables.find((table) => table.number === Number(tableId)),
    [enrichedServiceTables, tableId],
  );
  const assignedDiningTables = useMemo(
    () => enrichedServiceTables.filter((table) => Number(table.number) > 0),
    [enrichedServiceTables],
  );

  const isTakeout = Number(tableId) === 0;
  const assignedPartySize = currentTable?.currentPartySize ?? 0;

  const loadWaiterData = useCallback(async () => {
    try {
      const [summary, todayOrdersResponse] = await Promise.all([
        getWaiterSummary(),
        getMyWaiterOrdersToday(),
      ]);
      setStats({
        created: summary?.totalCreated || 0,
        delivered: summary?.totalDelivered || 0,
      });
      const cleanup = Array.isArray(summary?.pendingCleanupOrders)
        ? summary.pendingCleanupOrders
        : [];
      const active = Array.isArray(summary?.myActiveOrders) ? summary.myActiveOrders : [];
      setCleanupOrders(cleanup);
      setMyActiveOrders(active);
      setTodayOrders(Array.isArray(todayOrdersResponse) ? todayOrdersResponse : []);
      setOrderStore(active);
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
    }
  }, [setOrderStore]);

  const readyOrders = useMemo(
    () =>
      ordersFromStore.filter((order) => {
        const orderWaiterId = order?.waiterId ?? order?.WaiterId;
        const isMine = waiterMatchesAssignment({
          assignedWaiterId: orderWaiterId,
          assignedWaiterName: order.waiterName,
          waiterId,
          waiterName,
        });
        const isReady = order.status === 2 || String(order.status).toLowerCase() === "ready";
        return isMine && isReady;
      }),
    [ordersFromStore, waiterId, waiterName],
  );

  const todayOrdersSorted = useMemo(
    () =>
      [...todayOrders].sort(
        (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
      ),
    [todayOrders],
  );

  const activityActiveOrders = useMemo(
    () =>
      todayOrdersSorted.filter((order) => {
        const status = getOrderStatusNumber(order?.status);
        return status >= 0 && status <= 2;
      }),
    [todayOrdersSorted],
  );

  const activityDeliveredOrders = useMemo(
    () =>
      todayOrdersSorted.filter((order) => getOrderStatusNumber(order?.status) === 3),
    [todayOrdersSorted],
  );

  const activityCancelledOrders = useMemo(
    () =>
      todayOrdersSorted.filter((order) => getOrderStatusNumber(order?.status) === 4),
    [todayOrdersSorted],
  );

  const cleanupTasks = useMemo(
    () =>
      cleanupOrders.filter((order) => {
        const table = normalizedTables.find((item) => item.number === Number(order.tableNumber));
        if (!table) return false;

        return waiterMatchesAssignment({
          assignedWaiterId: table.assignedWaiterId,
          assignedWaiterName: table.assignedWaiterName,
          waiterId,
          waiterName,
        });
      }),
    [cleanupOrders, normalizedTables, waiterId, waiterName],
  );

  const categories = useMemo(
    () => ["Todas", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const visualCategories = useMemo(
    () =>
      categories
        .filter((category) => category !== "Todas")
        .map((category) => ({
          id: category,
          label: CATEGORY_IMAGE_MAP[category]?.label || category,
          image: CATEGORY_IMAGE_MAP[category]?.image || null,
          total: products.filter((product) => product.category === category).length,
        })),
    [categories, products],
  );

  const activeCategoryCard = useMemo(
    () => visualCategories.find((category) => category.id === activeCategory) || null,
    [activeCategory, visualCategories],
  );

  const filteredProducts = useMemo(
    () => (activeCategory === "Todas" ? products : products.filter((product) => product.category === activeCategory)),
    [activeCategory, products],
  );

  const cartTotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadWaiterData();

    const unsubReady = onOrderReady((order) => {
      showToast(`${getOrderLocationLabel(order)} esta LISTA`, "success");
      loadWaiterData();
    });
    const unsubDelivered = onOrderDelivered(() => loadWaiterData());
    const unsubPaid = onOrderPaid((order) => {
      if (Number(order?.tableNumber) > 0) {
        showToast(`${getOrderLocationLabel(order)} pagada, lista para limpieza`, "success");
      }
      loadWaiterData();
    });

    return () => {
      unsubReady?.();
      unsubDelivered?.();
      unsubPaid?.();
    };
  }, [loadWaiterData, showToast]);

  useEffect(() => {
    if (isConnected) void loadWaiterData();
  }, [isConnected, loadWaiterData]);

  useEffect(() => {
    const selectedTableStillAvailable = serviceTables.some(
      (table) => Number(table.number) === Number(tableId),
    );

    if (Number(tableId) === 0) return;

    if (!selectedTableStillAvailable) {
      if (assignedDiningTables.length > 0) {
        setTable(assignedDiningTables[0].number);
        return;
      }

      if (tableId !== null && tableId !== undefined && tableId !== "") {
        setTable(null);
      }
      return;
    }

    if ((tableId === null || tableId === undefined || tableId === "") && assignedDiningTables.length > 0) {
      setTable(assignedDiningTables[0].number);
    }
  }, [assignedDiningTables, enrichedServiceTables, serviceTables, setTable, tableId]);

  useEffect(() => {
    if (isTakeout) {
      if (pax !== "") setPax("");
      setLastAssignedTableAlert(null);
      return;
    }

    if (assignedPartySize > 0) {
      setPax(String(assignedPartySize));
      if (tableId && lastAssignedTableAlert !== tableId) {
        showToast(
          `Mesa ${tableId} ya fue asignada por host.`,
          "success",
        );
        setLastAssignedTableAlert(tableId);
      }
      return;
    }

    setLastAssignedTableAlert(null);
  }, [assignedPartySize, isTakeout, lastAssignedTableAlert, pax, showToast, tableId]);

  useEffect(() => {
    const currentAssignedDiningTables = assignedDiningTables.filter(
      (table) => Number(table.number) > 0 && Number(table.assignmentTimestamp || 0) > 0,
    );

    const nextKnownIds = new Set(
      currentAssignedDiningTables.map((table) => getAssignmentAlertId(table)),
    );

    const newAlerts = currentAssignedDiningTables
      .filter((table) => !knownAssignedTableAlertIdsRef.current.has(getAssignmentAlertId(table)))
      .map((table) => ({
        id: getAssignmentAlertId(table),
        tableNumber: table.number,
        assignedAt: Number(table.assignmentTimestamp || Date.now()),
      }))
      .sort((a, b) => a.assignedAt - b.assignedAt);

    if (newAlerts.length > 0) {
      const latestAlert = newAlerts[newAlerts.length - 1];
      showToast(
        `Nueva mesa asignada: mesa ${latestAlert.tableNumber}.`,
        "success",
      );

      setAssignmentAlerts((prev) => {
        const merged = [...prev];

        newAlerts.forEach((alert) => {
          if (!merged.some((item) => item.id === alert.id)) {
            merged.push(alert);
          }
        });

        return merged.sort((a, b) => a.assignedAt - b.assignedAt);
      });
    }

    setAssignmentAlerts((prev) =>
      prev.filter((alert) => nextKnownIds.has(alert.id)),
    );

    knownAssignedTableAlertIdsRef.current = nextKnownIds;
  }, [assignedDiningTables, showToast]);

  const dismissAssignmentAlert = useCallback((alertId) => {
    setAssignmentAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  const alertCenterItems = useMemo(() => {
    const assignmentItems = assignmentAlerts.map((alert) => ({
      id: `assignment-${alert.id}`,
      type: "assignment",
      priority: 0,
      tableNumber: alert.tableNumber,
      title: `Mesa ${alert.tableNumber} asignada`,
      subtitle: "Lista para tomar pedido",
      actionLabel: `Ir a mesa ${alert.tableNumber}`,
      createdAt: Number(alert.assignedAt || 0),
      onAction: () => {
        setTable(alert.tableNumber);
        setActiveTab("ordenar");
        dismissAssignmentAlert(alert.id);
      },
      onDismiss: () => dismissAssignmentAlert(alert.id),
    }));

    const readyItems = readyOrders.map((order) => ({
      id: `ready-${order.id}`,
      type: "ready",
      priority: 1,
      tableNumber: Number(order?.tableNumber || 0),
      title: order?.tableNumber > 0 ? `Mesa ${order.tableNumber} lista` : "Pedido para llevar listo",
      subtitle: order?.correlativeCode || `Orden ${order?.id || "---"}`,
      actionLabel: order?.tableNumber > 0 ? "Abrir entregas" : "Ver pedido listo",
      createdAt: new Date(order?.readyAt || order?.createdAt || 0).getTime(),
      onAction: () => {
        if (Number(order?.tableNumber) > 0) {
          setTable(order.tableNumber);
        }
        setActiveTab("listas");
      },
    }));

    const cleanupItems = cleanupTasks.map((order) => ({
      id: `cleanup-${order.id}-${order.tableNumber}`,
      type: "cleanup",
      priority: 2,
      tableNumber: Number(order?.tableNumber || 0),
      title: `Mesa ${order.tableNumber} lista para limpieza`,
      subtitle: order?.customerName ? `Cliente: ${order.customerName}` : "Caja ya confirmo el cobro",
      actionLabel: "Ir a limpieza",
      createdAt: new Date(order?.paidAt || order?.deliveredAt || order?.createdAt || 0).getTime(),
      onAction: () => {
        if (Number(order?.tableNumber) > 0) {
          setTable(order.tableNumber);
        }
        setActiveTab("limpieza");
      },
    }));

    return [...assignmentItems, ...readyItems, ...cleanupItems].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [assignmentAlerts, cleanupTasks, dismissAssignmentAlert, readyOrders, setTable]);

  const alertCenterSummary = useMemo(
    () => ({
      assignment: assignmentAlerts.length,
      ready: readyOrders.length,
      cleanup: cleanupTasks.length,
    }),
    [assignmentAlerts.length, cleanupTasks.length, readyOrders.length],
  );

  const handleStartCleaning = async (tableNumber) => {
    try {
      await startTableCleaning(tableNumber, { estimatedCleaningMinutes: DEFAULT_CLEANING_MINUTES });
      showToast(`Limpieza iniciada en mesa ${tableNumber}`, "success");
    } catch (error) {
      console.error("Error al iniciar limpieza:", error);
      const errorMessage =
        typeof error?.message === "string" && error.message !== "[object Object]"
          ? error.message
          : error?.response?.data?.error ||
            error?.response?.data?.message ||
            `No se pudo iniciar la limpieza de la mesa ${tableNumber}`;
      showToast(errorMessage, "error");
    }
  };

  const handleCloseTable = async (tableNumber) => {
    try {
      setCleaningTables((prev) => ({ ...prev, [tableNumber]: true }));
      await closeTable(tableNumber);
      await loadWaiterData();
      showToast(`Mesa ${tableNumber} lista para nuevos comensales`, "success");
    } catch (error) {
      console.error("Error al liberar mesa:", error);
      const errorMessage =
        typeof error?.message === "string" && error.message !== "[object Object]"
          ? error.message
          : error?.response?.data?.error ||
            error?.response?.data?.message ||
            `No se pudo liberar la mesa ${tableNumber}`;
      showToast(errorMessage, "error");
    } finally {
      setCleaningTables((prev) => ({ ...prev, [tableNumber]: false }));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white">
      <header className="sticky top-0 z-50 px-3 pt-3 lg:px-6 lg:pt-6 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto rounded-[2rem] border border-slate-800 bg-slate-900/85 shadow-2xl p-4 lg:p-5 flex items-start justify-between gap-4">
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tighter uppercase leading-none">
                KDS <span className="text-cyan-400">Terminal</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.28em] mt-1">
                Operador: {waiterName}
              </p>
            </div>
          </button>
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

            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:block">Cerrar sesion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 pb-32 pt-4 lg:px-6 lg:pb-10 space-y-5">
        <section className="sticky top-[92px] lg:top-[108px] z-40 rounded-[2rem] border border-slate-800 bg-slate-900/90 p-2 shadow-xl overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count =
                tab.id === "listas" ? readyOrders.length :
                tab.id === "limpieza" ? cleanupTasks.length :
                tab.id === "actividad" ? myActiveOrders.length :
                items.length;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-[1.4rem] transition-all border ${activeTab === tab.id ? "bg-cyan-400 text-slate-950 border-cyan-300" : "bg-slate-950/70 text-slate-300 border-slate-800"}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]">{tab.label}</span>
                  <span className={`min-w-7 h-7 px-2 rounded-full inline-flex items-center justify-center text-[10px] font-black ${activeTab === tab.id ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-cyan-300"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {alertCenterItems.length > 0 && (
          <section className="rounded-[1.6rem] border border-cyan-500/20 bg-[linear-gradient(135deg,_rgba(34,211,238,0.12)_0%,_rgba(15,23,42,0.95)_42%,_rgba(2,6,23,0.98)_100%)] p-3.5 sm:p-4 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                  Centro de alertas
                </p>
                <h2 className="mt-1.5 text-sm sm:text-lg font-black tracking-tighter uppercase text-white">
                  Pendientes del turno
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <AlertPill label="Nuevas mesas" value={alertCenterSummary.assignment} tone="amber" />
                <AlertPill label="Listas" value={alertCenterSummary.ready} tone="cyan" />
                <AlertPill label="Limpieza" value={alertCenterSummary.cleanup} tone="emerald" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {alertCenterItems.map((alert) => (
                <AlertCenterCard
                  key={alert.id}
                  alert={alert}
                />
              ))}
            </div>
          </section>
        )}

        {activeTab === "ordenar" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 space-y-5">
              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Nueva orden</p>
                    <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                      {isTakeout ? "Preparando pedido para llevar" : tableId ? `Mesa asignada ${tableId}` : assignedDiningTables.length > 0 ? "Mesa asignada o para llevar" : "Esperando mesa asignada o para llevar"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isTakeout && Number(tableId) > 0 && (
                      <button
                        onClick={() => setTable(0)}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-200 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-amber-300 hover:text-slate-950 transition-all"
                      >
                        <ReceiptText className="w-4 h-4" />
                        Cliente pide para llevar
                      </button>
                    )}
                    {isTakeout && assignedDiningTables.length > 0 && (
                      <button
                        onClick={() => setTable(assignedDiningTables[0].number)}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-cyan-400 hover:text-slate-950 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Volver a mesas
                      </button>
                    )}
                    {items.length > 0 && <button onClick={() => setIsCartOpen(true)} className="xl:hidden inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-black uppercase text-[10px] tracking-[0.2em]"><PackageCheck className="w-4 h-4" />Ver orden</button>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StepCard
                      step="1"
                      title="Mesa asignada o para llevar"
                    >
                    <TableSelector
                      tables={enrichedServiceTables}
                      allowOccupiedAssigned
                    />
                    {currentTable?.number > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-[1.2rem] border border-slate-800 bg-slate-950/80 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Ordenes hoy
                          </p>
                          <p className="mt-2 text-lg font-black text-white">
                            {currentTable.orderSummary?.totalOrdersToday || 0}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                            En curso
                          </p>
                          <p className="mt-2 text-lg font-black text-cyan-200">
                            {currentTable.orderSummary?.activeOrders || 0}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                            Ya pediste
                          </p>
                          <p className="mt-2 text-sm font-black uppercase text-emerald-200">
                            {(currentTable.orderSummary?.totalOrdersToday || 0) > 0 ? "Si" : "No"}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Puedes pasar una mesa a para llevar sin perder el borrador actual.
                    </p>  
                  </StepCard>
                </div>
              </section>

              <section className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80">Menu digital</p>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-white">{activeCategory === "Todas" ? "Explora por categoria" : activeCategoryCard?.label || activeCategory}</h2>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-cyan-300">{filteredProducts.length} items</div>
                </div>
                <div className="grid gap-4 mb-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {(activeCategory === "Todas" ? visualCategories : activeCategoryCard ? [activeCategoryCard] : []).map((category) => {
                    const isActive = activeCategory === category.id;
                    return (
                      <button key={category.id} onClick={() => setActiveCategory(isActive ? "Todas" : category.id)} className={`group relative overflow-hidden rounded-[1.5rem] border transition-all ${isActive ? "border-cyan-400/50 bg-slate-950 p-4" : "border-slate-800 bg-slate-950/50 flex flex-col w-full"}`}>
                        {isActive ? (
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950"><ChevronLeft className="w-6 h-6 stroke-[3px]" /></div>
                            <div className="text-left"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Volver</p><p className="text-sm font-black uppercase text-white">{category.label}</p></div>
                          </div>
                        ) : (
                          <>
                            <div className="relative w-full h-24 overflow-hidden">{category.image ? <img src={category.image} alt={category.label} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-slate-800" />}</div>
                            <div className="p-4 text-left"><p className="text-xs font-black uppercase tracking-widest text-white">{category.label}</p><p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{category.total} productos</p></div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <ProductList products={filteredProducts} />
              </section>
            </div>

            <aside className="hidden xl:block xl:col-span-4 2xl:col-span-3 sticky top-[220px]">
              <OrderPanel pax={pax} tableId={tableId} onOrderSent={() => setIsCartOpen(false)} />
            </aside>
          </div>
        )}

        {activeTab === "listas" && <section className="space-y-5"><SurfaceHeader eyebrow="Entregas" title="Pedidos listos para llevar a mesa" badge={`${readyOrders.length} pendientes`} /><ReadyOrdersView variant="inline" waiterId={waiterId} /></section>}

        {activeTab === "limpieza" && (
          <section className="space-y-5">
            <SurfaceHeader eyebrow="Limpieza" title="Mesas asignadas que te corresponde liberar" badge={`${cleanupTasks.length} pendientes`} />
            {cleanupTasks.length === 0 ? (
              <EmptyState title="No tienes mesas pendientes" subtitle="Cuando caja cobre una mesa asignada a ti, aparecera aqui." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cleanupTasks.map((order) => {
                  const table = normalizedTables.find((item) => item.number === Number(order.tableNumber));
                  const cleaning = table?.cleaning;
                  const cleaningEndsAt = cleaning ? Number(cleaning.startedAt) + Number(cleaning.estimatedMinutes) * 60000 : null;
                  return (
                    <div key={`${order.id}-${order.tableNumber}`} className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/70 p-5 shadow-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesa</p><p className="text-3xl font-black text-white mt-2 leading-none">{getOrderLocationLabel(order)}</p></div>
                        <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">{cleaning ? "Limpiando" : "Pagada"}</span>
                      </div>
                      <div className="mt-5 space-y-3">
                        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p><p className="text-sm font-black uppercase text-slate-100 mt-2">{order.customerName || "General"}</p></div>
                        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Estimado</p><p className="text-sm font-black uppercase text-slate-100 mt-2">{cleaning ? `Mesa libre en ${formatCountdown(cleaningEndsAt, now)}` : `Si inicias ahora: ${formatMinutes(DEFAULT_CLEANING_MINUTES)}`}</p></div>
                        {cleaning ? (
                          <button onClick={() => handleCloseTable(order.tableNumber)} disabled={cleaningTables[order.tableNumber]} className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] disabled:opacity-50">{cleaningTables[order.tableNumber] ? "Liberando..." : "Termine de limpiar"}</button>
                        ) : (
                          <button onClick={() => handleStartCleaning(order.tableNumber)} className="w-full py-4 rounded-[1.4rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em]">Iniciar limpieza</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "actividad" && (
          <section className="space-y-5">
            <SurfaceHeader eyebrow="Seguimiento" title="Estado e historial de tus ordenes" badge={`${todayOrdersSorted.length} hoy`} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Creadas hoy" value={stats.created} accent="text-white" />
              <MetricCard label="Entregadas" value={stats.delivered} accent="text-emerald-300" />
              <MetricCard label="En cocina" value={activityActiveOrders.filter((o) => [0, 1].includes(getOrderStatusNumber(o.status))).length} accent="text-yellow-300" />
              <MetricCard label="Esperando entrega" value={readyOrders.length} accent="text-cyan-300" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                      Activas
                    </p>
                    <h3 className="text-lg font-black uppercase tracking-[0.16em] text-white mt-2">
                      Tus ordenes en curso
                    </h3>
                  </div>
                  <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.18em]">
                    {activityActiveOrders.length} activas
                  </div>
                </div>

                {activityActiveOrders.length === 0 ? (
                  <EmptyState title="No tienes ordenes activas" subtitle="Cuando envies una nueva orden o cocina avance una actual, aparecera aqui." />
                ) : (
                  <div className="space-y-3">
                    {activityActiveOrders.map((order) => (
                      <OrderActivityCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                      Historial
                    </p>
                    <h3 className="text-lg font-black uppercase tracking-[0.16em] text-white mt-2">
                      Lo que llevas hoy
                    </h3>
                  </div>
                  <div className="px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-[0.18em]">
                    {activityDeliveredOrders.length} entregadas
                  </div>
                </div>

                {todayOrdersSorted.length === 0 ? (
                  <EmptyState title="Sin actividad hoy" subtitle="Todavia no tienes ordenes registradas en este turno." />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniMetricCard label="Activas" value={activityActiveOrders.length} accent="text-cyan-300" />
                      <MiniMetricCard label="Entregadas" value={activityDeliveredOrders.length} accent="text-emerald-300" />
                      <MiniMetricCard label="Canceladas" value={activityCancelledOrders.length} accent="text-red-300" />
                    </div>

                    <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                      {todayOrdersSorted.map((order) => (
                        <OrderActivityCard key={`history-${order.id}`} order={order} compact />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      {activeTab === "ordenar" && items.length > 0 && !isCartOpen && <button onClick={() => setIsCartOpen(true)} className="xl:hidden fixed bottom-5 left-3 right-3 z-40 rounded-[1.6rem] bg-cyan-400 text-slate-950 px-5 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><PackageCheck className="w-5 h-5" /><div className="text-left"><p className="text-[10px] font-black uppercase">Orden actual</p><p className="text-xs font-black uppercase">{items.length}</p></div></div><div className="text-right"><p className="text-lg font-black">${cartTotal.toFixed(2)}</p><p className="text-[10px] font-black uppercase">Abrir</p></div></button>}
      {activeTab === "ordenar" && isCartOpen && <div className="fixed inset-0 bg-slate-950/40 z-40 xl:hidden" onClick={() => setIsCartOpen(false)} />}
      {activeTab === "ordenar" && <aside className={`xl:hidden fixed inset-y-0 right-0 z-50 w-[84vw] max-w-[380px] bg-slate-950 border-l border-slate-800 transition-transform ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}><div className="h-full overflow-y-auto p-2.5 sm:p-3"><div className="flex items-center justify-between mb-2 sm:mb-3 px-1"><div><p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Orden actual</p><p className="text-xs sm:text-sm font-black uppercase text-white mt-1">Panel de confirmacion</p></div><button onClick={() => setIsCartOpen(false)} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em]"><X className="w-4 h-4" />Cerrar</button></div><OrderPanel pax={pax} tableId={tableId} onOrderSent={() => setIsCartOpen(false)} /></div></aside>}
      {showProfile && <WaiterProfile user={currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
}

const MetricCard = ({ label, value, accent }) => (
  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/75 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className={`text-2xl sm:text-3xl font-black mt-3 ${accent}`}>{value}</p>
  </div>
);

const MiniMetricCard = ({ label, value, accent }) => (
  <div className="rounded-[1.3rem] border border-slate-800 bg-slate-950/70 p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={`mt-2 text-xl font-black ${accent}`}>{value}</p>
  </div>
);

const OrderActivityCard = ({ order, compact = false }) => {
  const status = getOrderStatusConfig(order?.status);
  const itemCount = Array.isArray(order?.items)
    ? order.items.reduce((acc, item) => acc + Number(item?.quantity || 0), 0)
    : 0;

  const statusTime =
    order?.paidAt ||
    order?.deliveredAt ||
    order?.readyAt ||
    order?.startedAt ||
    order?.createdAt;

  return (
    <article className={`rounded-[1.6rem] border border-slate-800 bg-slate-950/75 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            {getOrderLocationLabel(order)}
          </p>
          <h4 className={`${compact ? "text-sm" : "text-lg"} mt-2 font-black uppercase tracking-[0.14em] text-white break-all`}>
            {order?.correlativeCode || `Orden ${order?.id || "---"}`}
          </h4>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Cliente: {order?.customerName || "General"}
          </p>
        </div>

        <span className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] ${status.badge}`}>
          {status.label}
        </span>
      </div>

      <div className={`mt-4 grid ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"} gap-3`}>
        <InfoPill label="Hora" value={formatOrderTime(statusTime)} accent={status.accent} />
        <InfoPill label="Productos" value={itemCount} accent="text-cyan-300" />
        <InfoPill label="Total" value={formatOrderCurrency(order?.totalAmount)} accent="text-emerald-300" />
        {!compact && (
          <InfoPill
            label="Cobro"
            value={order?.isPaid ? "Pagada" : "Pendiente"}
            accent={order?.isPaid ? "text-emerald-300" : "text-amber-300"}
          />
        )}
      </div>

      {!compact && Array.isArray(order?.items) && order.items.length > 0 && (
        <div className="mt-4 rounded-[1.2rem] border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            Resumen de pedido
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.items.map((item, index) => (
              <div
                key={`${order?.id}-${index}`}
                className="rounded-[1rem] border border-slate-800 bg-slate-950/80 px-3 py-2"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                  {item?.quantity}x {item?.productName}
                </p>
                {item?.notes && (
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-300">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

const InfoPill = ({ label, value, accent }) => (
  <div className="rounded-[1.2rem] border border-slate-800 bg-slate-900/70 p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className={`mt-2 text-sm font-black uppercase ${accent}`}>{value}</p>
  </div>
);

const StepCard = ({ step, title, subtitle, children }) => (
  <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4 md:p-5">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-black flex items-center justify-center shrink-0">{step}</div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">{title}</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const SurfaceHeader = ({ eyebrow, title, badge }) => (
  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p><h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">{title}</h2></div>
    <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em]">{badge}</div>
  </div>
);

const EmptyState = ({ title, subtitle }) => (
  <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{title}</p>
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 mt-3">{subtitle}</p>
  </div>
);

const AlertPill = ({ label, value, tone }) => {
  const toneMap = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  };

  return (
    <div className={`rounded-full border px-3 py-1.5 ${toneMap[tone] || toneMap.cyan}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-0.5 text-xs font-black">{value}</p>
    </div>
  );
};

const AlertCenterCard = ({ alert }) => {
  const toneMap = {
    assignment: {
      badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      button: "bg-amber-300 text-slate-950 hover:bg-amber-200",
      label: "Nueva mesa",
    },
    ready: {
      badge: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
      button: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
      label: "Pedido listo",
    },
    cleanup: {
      badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      button: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
      label: "Limpieza",
    },
  };

  const tone = toneMap[alert.type] || toneMap.ready;

  return (
    <article className="rounded-[1.2rem] border border-slate-800 bg-slate-950/75 p-3">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${tone.badge}`}>
            {tone.label}
          </span>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-white">
            {alert.title}
          </p>
          <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            {alert.subtitle}
          </p>
        </div>

        {alert.onDismiss ? (
          <button
            type="button"
            onClick={alert.onDismiss}
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 transition-all hover:text-white"
            aria-label={`Cerrar alerta ${alert.title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={alert.onAction}
        className={`mt-3 w-full rounded-[1rem] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${tone.button}`}
      >
        {alert.actionLabel}
      </button>
    </article>
  );
};
