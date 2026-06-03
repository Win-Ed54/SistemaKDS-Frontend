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
  ArrowUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { logout } from "../services/authService";
import { getAuthValue, setAuthValue } from "../services/authStorage";
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
import {
  onOrderCancelled,
  onOrderDelivered,
  onOrderPaid,
  onOrderPreparing,
  onOrderReady,
} from "../services/signalrService";
import useOrderStore from "../store/orderStore";
import OrderPanel from "../components/waiter/OrderPanel";
import ProductList from "../components/waiter/ProductList";
import ReadyOrdersView from "../components/waiter/ReadyOrdersView";
import TableSelector from "../components/waiter/TableSelector";
import WaiterProfile from "../components/waiter/WaiterProfile";
import { readViewState, writeViewState } from "../utils/viewStateStorage";
import { sortCategoriesForDisplay, sortProductsForDisplay } from "../utils/displayOrder";

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
  Desayunos: {
    label: "Desayunos",
    image: encodeURI("/assets/images/categoria/postres.webp"),
  },
  "Combos de Wendy": {
    label: "Combos de Wendy",
    image: encodeURI("/assets/images/categoria/hamburguesas.webp"),
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

const getTakeoutDestination = (order) =>
  String(order?.takeoutDestination || order?.TakeoutDestination || "").trim();

const getOrderLocationLabel = (order) => {
  if (Number(order?.tableNumber) > 0) return `Mesa ${order.tableNumber}`;

  const destination = getTakeoutDestination(order);
  return destination ? `Para llevar · ${destination}` : "Para llevar";
};

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
const normalizeServiceScope = (value) => {
  const normalized = String(value || "hybrid").trim().toLowerCase();
  return ["dining", "takeout", "hybrid"].includes(normalized) ? normalized : "hybrid";
};
const getServiceScopeLabel = (serviceScope) => {
  if (serviceScope === "dining") return "Solo mesas";
  if (serviceScope === "takeout") return "Solo para llevar";
  return "Servicio mixto";
};

const getServiceScopeSubtitle = (serviceScope) => {
  if (serviceScope === "dining") return "Atiende mesas asignadas por host";
  if (serviceScope === "takeout") return "Responsable de pedidos para llevar";
  return "Puede atender mesas y para llevar";
};

const getSelectionStepTitle = ({
  canHandleDining,
  canHandleStandaloneTakeout,
  isTakeout,
}) => {
  if (isTakeout && canHandleDining) return "Cambia entre mesas y para llevar";
  if (canHandleDining && canHandleStandaloneTakeout) return "Selecciona mesa o para llevar";
  if (canHandleDining) return "Selecciona tu mesa asignada";
  return "Gestiona tu pedido para llevar";
};

const getSelectionStepSubtitle = ({
  canHandleDining,
  canHandleStandaloneTakeout,
  isTakeout,
}) => {
  if (isTakeout && canHandleDining) return "Puedes volver a una mesa asignada cuando quieras";
  if (canHandleDining && canHandleStandaloneTakeout) return "Usa el acceso rapido segun el tipo de servicio";
  if (canHandleDining) return "Solo aparecen las mesas asignadas por host";
  return "Tu terminal trabaja sin mesas asignadas";
};

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

const getOrderId = (order) => order?.id ?? order?._id ?? order?.Id;

const mergeActiveOrdersPreservingLatestStatus = (incomingOrders, currentOrders) => {
  const currentById = new Map(
    (Array.isArray(currentOrders) ? currentOrders : [])
      .map((order) => [getOrderId(order), order])
      .filter(([id]) => Boolean(id)),
  );

  return (Array.isArray(incomingOrders) ? incomingOrders : []).map((order) => {
    const id = getOrderId(order);
    const current = id ? currentById.get(id) : null;

    if (!current) return order;

    const incomingStatus = getOrderStatusNumber(order?.status);
    const currentStatus = getOrderStatusNumber(current?.status);

    if (currentStatus > incomingStatus) {
      return { ...order, ...current, status: currentStatus };
    }

    return order;
  });
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

const mergeOrderIntoList = (orders, incomingOrder) => {
  if (!incomingOrder) return Array.isArray(orders) ? orders : [];

  const nextOrders = Array.isArray(orders) ? [...orders] : [];
  const incomingId = getOrderId(incomingOrder);
  if (!incomingId) return nextOrders;

  const currentIndex = nextOrders.findIndex((order) => getOrderId(order) === incomingId);

  if (currentIndex >= 0) {
    nextOrders[currentIndex] = { ...nextOrders[currentIndex], ...incomingOrder };
    return nextOrders;
  }

  return [incomingOrder, ...nextOrders];
};

const upsertActiveOrderList = (orders, incomingOrder) => {
  const merged = mergeOrderIntoList(orders, incomingOrder);
  return merged.filter((order) => {
    const status = getOrderStatusNumber(order?.status);
    return status >= 0 && status <= 2;
  });
};

export default function WaiterView() {
  const navigate = useNavigate();
  const { connection, isConnected } = useSignalRConnection("waiter");
  const { settings } = useKdsSettings();
  const { products } = useProducts();
  const { tables, refetch: refetchTables } = useTables();
  const { tableId, items, setTable } = useOrderBuilder();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const setOrderStore = useOrderStore((state) => state.setOrders);
  const updateOrderStore = useOrderStore((state) => state.updateOrder);
  const clearOrderStore = useOrderStore((state) => state.clearOrders);
  const { showToast } = useToast();
  const waiterName = getAuthValue("user_name") || "Mesero de Turno";
  const [waiterServiceScope, setWaiterServiceScope] = useState(() =>
    normalizeServiceScope(getAuthValue("service_scope")),
  );

  const [showProfile, setShowProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState(() =>
    readViewState("waiter", waiterName, "activeCategory", "Todas"),
  );
  const [activeTab, setActiveTab] = useState(() =>
    readViewState("waiter", waiterName, "activeTab", "ordenar"),
  );
  const [pax, setPax] = useState("");
  const [stats, setStats] = useState({ created: 0, delivered: 0 });
  const [cleanupOrders, setCleanupOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [hasDedicatedTakeoutWaiter, setHasDedicatedTakeoutWaiter] = useState(false);
  const [cleaningTables, setCleaningTables] = useState({});
  const [startingCleaningTables, setStartingCleaningTables] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isDesktopCartOpen, setIsDesktopCartOpen] = useState(() =>
    readViewState("waiter", waiterName, "isDesktopCartOpen", true),
  );
  const [expandedOrderIds, setExpandedOrderIds] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [lastAssignedTableAlert, setLastAssignedTableAlert] = useState(null);
  const [takeoutSourceTableId, setTakeoutSourceTableId] = useState(null);
  const knownAssignedTableAlertIdsRef = useRef(new Set());
  const refreshTimeoutRef = useRef(null);

  const waiterId = getCurrentUserId();
  const currentUser = { username: waiterName, role: "waiter" };
  const canHandleDining = waiterServiceScope === "dining" || waiterServiceScope === "hybrid";
  const canHandleStandaloneTakeout =
    waiterServiceScope === "takeout" ||
    (waiterServiceScope === "hybrid" && !hasDedicatedTakeoutWaiter);
  const canHandleTableTakeout = canHandleDining;
  const defaultCleaningMinutes =
    Number(settings?.defaultCleaningMinutes) > 0
      ? Number(settings.defaultCleaningMinutes)
      : DEFAULT_CLEANING_MINUTES;

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
        if (table.number === 0) return canHandleStandaloneTakeout;
        if (!canHandleDining) return false;

        return waiterMatchesAssignment({
          assignedWaiterId: table.assignedWaiterId,
          assignedWaiterName: table.assignedWaiterName,
          waiterId,
          waiterName,
        });
      }).sort(compareAssignedTablesByArrival),
    [canHandleDining, canHandleStandaloneTakeout, normalizedTables, waiterId, waiterName],
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
  const selectableAssignedDiningTables = useMemo(
    () => assignedDiningTables.filter((table) => !table.cleaning),
    [assignedDiningTables],
  );

  const isTakeout = Number(tableId) === 0;
  const assignedPartySize = currentTable?.currentPartySize ?? 0;
  const isCurrentTableCleaning = Boolean(currentTable?.cleaning);
  const canCreateOrders = canHandleDining || canHandleStandaloneTakeout;
  const isWaitingForAssignedDiningTable =
    (canHandleDining &&
      !canHandleStandaloneTakeout &&
      selectableAssignedDiningTables.length === 0) ||
    (!canCreateOrders && !canHandleStandaloneTakeout);
  const canUseMenu = canCreateOrders && !isCurrentTableCleaning && !isWaitingForAssignedDiningTable;

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
      setHasDedicatedTakeoutWaiter(Boolean(summary?.hasDedicatedTakeoutWaiter));
      const cleanup = Array.isArray(summary?.pendingCleanupOrders)
        ? summary.pendingCleanupOrders
        : [];
      const active = Array.isArray(summary?.myActiveOrders) ? summary.myActiveOrders : [];
      const mergedActive = mergeActiveOrdersPreservingLatestStatus(active, useOrderStore.getState().orders);
      setCleanupOrders(cleanup);
      setMyActiveOrders(active);
      setTodayOrders(Array.isArray(todayOrdersResponse) ? todayOrdersResponse : []);
      setOrderStore(mergedActive);
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
    }
  }, [setOrderStore]);

  const scheduleWaiterRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) return;

    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      void loadWaiterData();
    }, 250);
  }, [loadWaiterData]);

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

  const categories = useMemo(() => ["Todas", ...sortCategoriesForDisplay(products)], [products]);

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
    () =>
      sortProductsForDisplay(
        activeCategory === "Todas"
          ? products
          : products.filter((product) => product.category === activeCategory),
        activeCategory,
      ),
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
    writeViewState("waiter", waiterName, "activeCategory", activeCategory);
  }, [activeCategory, waiterName]);

  useEffect(() => {
    writeViewState("waiter", waiterName, "activeTab", activeTab);
  }, [activeTab, waiterName]);

  useEffect(() => {
    writeViewState("waiter", waiterName, "isDesktopCartOpen", isDesktopCartOpen);
  }, [isDesktopCartOpen, waiterName]);

  useEffect(() => {
    clearOrderStore();
    void loadWaiterData();

    const unsubPreparing = onOrderPreparing((order) => {
      if (order) {
        updateOrderStore(order);
        setTodayOrders((prev) => mergeOrderIntoList(prev, order));
        setMyActiveOrders((prev) => upsertActiveOrderList(prev, order));
      }
      scheduleWaiterRefresh();
    });
    const unsubReady = onOrderReady((order) => {
      if (order) {
        updateOrderStore(order);
        setTodayOrders((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          const orderId = getOrderId(order);
          const exists = current.some((item) => getOrderId(item) === orderId);

          if (!exists) {
            return [order, ...current];
          }

          return current.map((item) =>
            getOrderId(item) === orderId ? { ...item, ...order } : item,
          );
        });
      }
      showToast(`${getOrderLocationLabel(order)} esta LISTA`, "success");
      scheduleWaiterRefresh();
    });
    const unsubDelivered = onOrderDelivered((order) => {
      if (order && typeof order === "object") {
        setTodayOrders((prev) => mergeOrderIntoList(prev, order));
      }
      if (order && typeof order === "object") {
        setMyActiveOrders((prev) =>
          prev.filter((entry) => getOrderId(entry) !== getOrderId(order)),
        );
      }
      scheduleWaiterRefresh();
    });
    const unsubCancelled = onOrderCancelled((order) => {
      if (order && typeof order === "object") {
        setTodayOrders((prev) => mergeOrderIntoList(prev, order));
        setMyActiveOrders((prev) =>
          prev.filter((entry) => getOrderId(entry) !== getOrderId(order)),
        );
      }
      scheduleWaiterRefresh();
    });
    const unsubPaid = onOrderPaid((order) => {
      if (order) {
        setTodayOrders((prev) => mergeOrderIntoList(prev, order));
        setMyActiveOrders((prev) => upsertActiveOrderList(prev, order));
      }
      if (Number(order?.tableNumber) > 0) {
        showToast(`${getOrderLocationLabel(order)} pagada, lista para limpieza`, "success");
      }
      scheduleWaiterRefresh();
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      clearOrderStore();
      unsubPreparing?.();
      unsubReady?.();
      unsubDelivered?.();
      unsubCancelled?.();
      unsubPaid?.();
    };
  }, [clearOrderStore, loadWaiterData, scheduleWaiterRefresh, showToast, updateOrderStore]);

  useEffect(() => {
    if (!connection) return undefined;

    const handleServiceScopeChange = (payload) => {
      const nextScope = normalizeServiceScope(
        payload?.serviceScope ?? payload?.ServiceScope ?? getAuthValue("service_scope"),
      );

      setAuthValue("service_scope", nextScope);
      setWaiterServiceScope(nextScope);
      showToast(`Tu alcance de servicio cambió a ${getServiceScopeLabel(nextScope)}`, "success");

      if (nextScope === "takeout") {
        setTable(0);
      } else if (nextScope === "dining" && selectableAssignedDiningTables.length > 0) {
        setTable(selectableAssignedDiningTables[0].number);
      }

      window.dispatchEvent(new Event("auth-changed"));
      window.dispatchEvent(new Event("kds-sync-tables"));
      window.dispatchEvent(new Event("kds-sync-products"));
      void refetchTables();
      void loadWaiterData();
    };

    connection.on("servicescopeupdated", handleServiceScopeChange);
    connection.on("ServiceScopeUpdated", handleServiceScopeChange);

    return () => {
      connection.off("servicescopeupdated", handleServiceScopeChange);
      connection.off("ServiceScopeUpdated", handleServiceScopeChange);
    };
  }, [connection, loadWaiterData, refetchTables, selectableAssignedDiningTables, setTable, showToast]);

  useEffect(() => {
    if (isConnected) scheduleWaiterRefresh();
  }, [isConnected, scheduleWaiterRefresh]);

  useEffect(() => {
    if (isConnected) {
      void refetchTables();
    }
  }, [isConnected, refetchTables]);

  useEffect(() => {
    const selectedTableStillAvailable = serviceTables.some(
      (table) => Number(table.number) === Number(tableId),
    );

    if (Number(tableId) === 0) {
      if (!canHandleStandaloneTakeout) {
        if (selectableAssignedDiningTables.length > 0) {
          setTable(selectableAssignedDiningTables[0].number);
        }
      }
      return;
    }

    if (!selectedTableStillAvailable) {
      if (selectableAssignedDiningTables.length > 0) {
        setTable(selectableAssignedDiningTables[0].number);
        return;
      }

      if (canHandleStandaloneTakeout && Number(tableId) !== 0) {
        setTable(0);
      }
      return;
    }

    if (currentTable?.cleaning && selectableAssignedDiningTables.length > 0) {
      const fallbackTable = selectableAssignedDiningTables.find(
        (table) => Number(table.number) !== Number(currentTable.number),
      );

      if (fallbackTable) {
        setTable(fallbackTable.number);
        return;
      }

      if (canHandleStandaloneTakeout) {
        setTable(0);
      }
      return;
    }

    if ((tableId === null || tableId === undefined || tableId === "") && selectableAssignedDiningTables.length > 0) {
      setTable(selectableAssignedDiningTables[0].number);
      return;
    }

    if ((tableId === null || tableId === undefined || tableId === "") && canHandleStandaloneTakeout) {
      setTable(0);
    }
  }, [canHandleStandaloneTakeout, currentTable, selectableAssignedDiningTables, serviceTables, setTable, tableId]);

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

    }

    knownAssignedTableAlertIdsRef.current = nextKnownIds;
  }, [assignedDiningTables, showToast]);

  const handleStartCleaning = async (tableNumber) => {
    try {
      setStartingCleaningTables((prev) => ({ ...prev, [tableNumber]: true }));
      await startTableCleaning(tableNumber, { estimatedCleaningMinutes: defaultCleaningMinutes });
      window.dispatchEvent(new Event("kds-sync-tables"));
      scheduleWaiterRefresh();
      showToast(`Limpieza iniciada en mesa ${tableNumber}`, "success");
    } catch (error) {
      console.error("Error al iniciar limpieza:", error);
      window.dispatchEvent(new Event("kds-sync-tables"));
      scheduleWaiterRefresh();
      const errorMessage =
        typeof error?.message === "string" && error.message !== "[object Object]"
          ? error.message
          : error?.response?.data?.error ||
            error?.response?.data?.message ||
            `No se pudo iniciar la limpieza de la mesa ${tableNumber}`;
      showToast(errorMessage, "error");
    } finally {
      setStartingCleaningTables((prev) => ({ ...prev, [tableNumber]: false }));
    }
  };

  const handleCloseTable = async (tableNumber) => {
    try {
      setCleaningTables((prev) => ({ ...prev, [tableNumber]: true }));
      await closeTable(tableNumber);
      window.dispatchEvent(new Event("kds-sync-tables"));
      await loadWaiterData();
      showToast(`Mesa ${tableNumber} lista para nuevos comensales`, "success");
    } catch (error) {
      console.error("Error al liberar mesa:", error);
      window.dispatchEvent(new Event("kds-sync-tables"));
      scheduleWaiterRefresh();
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

  const toggleOrderExpanded = useCallback((orderId) => {
    if (!orderId) return;

    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }, []);

  const handleOrderCreated = useCallback((createdOrder) => {
    if (!createdOrder) {
      scheduleWaiterRefresh();
      return;
    }

    updateOrderStore(createdOrder);
    setTodayOrders((prev) => mergeOrderIntoList(prev, createdOrder));
    setMyActiveOrders((prev) => upsertActiveOrderList(prev, createdOrder));
    scheduleWaiterRefresh();
  }, [scheduleWaiterRefresh, updateOrderStore]);

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white">
      <header className="sticky top-0 z-50 px-3 pt-3 lg:px-5 lg:pt-4 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto rounded-[1.4rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.10),_transparent_24%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] px-4 py-3 shadow-2xl">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-cyan-500/20 bg-cyan-500/10">
                <User className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter uppercase leading-none sm:text-xl">
                  KDS <span className="text-cyan-400">Terminal</span>
                </h1>
                <p className="mt-0.5 text-[8px] text-slate-500 font-black uppercase tracking-[0.24em]">
                  Operador: {waiterName}
                </p>
                <p className="mt-2 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  {getServiceScopeLabel(waiterServiceScope)}
                </p>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
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

              <div className="h-8 w-px bg-slate-800" />
              <button onClick={handleLogout} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-[9px] font-black uppercase tracking-[0.18em] hover:bg-red-500 hover:text-white transition-all">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Cerrar sesion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 pb-32 pt-4 lg:px-5 lg:pb-10 lg:pt-3 space-y-5">
        <section className="sticky top-[88px] z-40 mt-2 rounded-[1.7rem] border border-slate-700/80 bg-[linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(2,6,23,0.92)_100%)] p-2 shadow-[0_18px_35px_rgba(2,6,23,0.32)] backdrop-blur-md overflow-x-auto no-scrollbar sm:top-[94px] xl:top-[104px] xl:mt-0 xl:rounded-[2rem] xl:p-2.5">
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

        {activeTab === "ordenar" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 space-y-5">
              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Nueva orden</p>
                    <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                      {isTakeout
                        ? "Preparando pedido para llevar"
                        : tableId
                          ? `Mesa asignada ${tableId}`
                          : canHandleDining && canHandleStandaloneTakeout
                            ? assignedDiningTables.length > 0
                              ? "Mesa asignada o para llevar"
                              : "Esperando mesa asignada o para llevar"
                            : canHandleDining
                              ? "Esperando mesa asignada"
                              : "Preparando pedido para llevar"}
                    </h2>
                    <p className="mt-3 inline-flex rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                      {getServiceScopeSubtitle(waiterServiceScope)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isTakeout && canHandleTableTakeout && Number(tableId) > 0 && (
                      <button
                        onClick={() => {
                          setTakeoutSourceTableId(Number(tableId));
                          setTable(0);
                        }}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-200 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-amber-300 hover:text-slate-950 transition-all"
                      >
                        <ReceiptText className="w-4 h-4" />
                        Cliente pide para llevar
                      </button>
                    )}
                    {isTakeout && canHandleDining && selectableAssignedDiningTables.length > 0 && (
                      <button
                        onClick={() => {
                          setTakeoutSourceTableId(null);
                          setTable(selectableAssignedDiningTables[0].number);
                        }}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-cyan-400 hover:text-slate-950 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Volver a mesas
                      </button>
                    )}
                    {items.length > 0 && <button onClick={() => setIsCartOpen(true)} className="xl:hidden inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-black uppercase text-[10px] tracking-[0.2em]"><PackageCheck className="w-4 h-4" />Ver orden</button>}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <StepCard
                      step="1"
                      title={getSelectionStepTitle({
                        canHandleDining,
                        canHandleStandaloneTakeout,
                        isTakeout,
                      })}
                      subtitle={getSelectionStepSubtitle({
                        canHandleDining,
                        canHandleStandaloneTakeout,
                        isTakeout,
                      })}
                    >
                    <TableSelector
                      tables={enrichedServiceTables}
                      allowOccupiedAssigned
                      allowTakeout={canHandleStandaloneTakeout || canHandleDining}
                      onTakeoutSelect={(sourceTable) => setTakeoutSourceTableId(sourceTable)}
                      emptyDiningMessage={
                        canHandleDining
                          ? "Sin mesas asignadas por ahora"
                          : "Modo para llevar activo"
                      }
                    />
                    {isCurrentTableCleaning && (
                      <div className="mt-4 rounded-[1.2rem] border border-rose-400/20 bg-rose-400/10 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-200">
                          Mesa en limpieza
                        </p>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                          Esta mesa no acepta nuevas ordenes hasta que termine la limpieza.
                        </p>
                      </div>
                    )}
                    {currentTable?.number > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-[1.2rem] border border-fuchsia-500/20 bg-fuchsia-500/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-fuchsia-300">
                            Clientes
                          </p>
                          <p className="mt-2 text-lg font-black text-fuchsia-100">
                            {currentTable.currentPartySize || 0}
                          </p>
                        </div>
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
                            Listas
                          </p>
                          <p className="mt-2 text-lg font-black text-emerald-200">
                            {currentTable.orderSummary?.readyOrders || 0}
                          </p>
                        </div>
                      </div>
                    )}
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
                {!canUseMenu ? (
                  <div className="rounded-[1.8rem] border border-dashed border-amber-400/20 bg-amber-400/10 p-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
                      Alcance de servicio bloqueado
                    </p>
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-slate-100">
                      Pedido en Espera, Necesitas una mesa asignada.
                    </p>
                  </div>
                ) : isCurrentTableCleaning ? (
                  <div className="rounded-[1.8rem] border border-rose-400/20 bg-rose-400/10 p-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">
                      Mesa en limpieza
                    </p>
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-slate-100">
                      No se pueden agregar mas productos hasta liberar la mesa.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 mb-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {(activeCategory === "Todas" ? visualCategories : activeCategoryCard ? [activeCategoryCard] : []).map((category) => {
                        const isActive = activeCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            disabled={!canUseMenu}
                            onClick={() => setActiveCategory(isActive ? "Todas" : category.id)}
                            className={`group relative overflow-hidden rounded-[1.5rem] border transition-all ${isActive ? "border-cyan-400/50 bg-slate-950 p-4" : "border-slate-800 bg-slate-950/50 flex flex-col w-full"} ${!canUseMenu ? "cursor-not-allowed opacity-60" : ""}`}
                          >
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
                    <ProductList products={filteredProducts} disabled={!canUseMenu} />
                  </>
                )}
              </section>
            </div>

            <aside
              className={`hidden xl:sticky xl:top-[96px] xl:block xl:h-[calc(100dvh-112px)] transition-all duration-300 ${
                isDesktopCartOpen
                  ? "xl:col-span-4 2xl:col-span-3"
                  : "xl:col-span-1"
              }`}
            >
              {isDesktopCartOpen ? (
                <div className="relative flex h-full min-h-0 flex-col gap-3 pr-1">
                  <button
                    type="button"
                    onClick={() => setIsDesktopCartOpen(false)}
                    className="inline-flex w-full shrink-0 items-center justify-between rounded-[1.2rem] border border-slate-800 bg-slate-950/95 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 shadow-xl transition-all hover:border-cyan-400/40 hover:text-cyan-200"
                  >
                    <span>Ocultar pedido</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="min-h-0 flex-1">
                    {isWaitingForAssignedDiningTable ? (
                      <div className="flex h-full items-center justify-center rounded-[1.8rem] border border-dashed border-amber-400/20 bg-amber-400/10 p-6 text-center">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                            Pedido en espera
                          </p>
                          <p className="mt-3 text-sm font-black uppercase text-slate-100">
                            Necesitas una mesa asignada para empezar a tomar ordenes.
                          </p>
                        </div>
                      </div>
                    ) : isCurrentTableCleaning ? (
                      <div className="flex h-full items-center justify-center rounded-[1.8rem] border border-rose-400/20 bg-rose-400/10 p-6 text-center">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">
                            Pedido bloqueado
                          </p>
                          <p className="mt-3 text-sm font-black uppercase text-slate-100">
                            La mesa seleccionada se esta limpiando.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <OrderPanel
                        key={`desktop-order-panel-${tableId ?? "none"}`}
                        pax={pax}
                        tableId={tableId}
                        onOrderSent={handleOrderCreated}
                        canHandleTakeout={canHandleTableTakeout}
                        canHandleDining={canHandleDining}
                        sourceTableId={takeoutSourceTableId ?? (Number(tableId) > 0 ? tableId : null)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDesktopCartOpen(true)}
                  className="flex min-h-[260px] w-full flex-col items-center justify-between rounded-[1.8rem] border border-cyan-400/25 bg-cyan-400/10 px-3 py-5 text-cyan-200 shadow-xl transition-all hover:bg-cyan-400 hover:text-slate-950"
                  aria-label="Abrir panel de pedido"
                >
                  <ChevronLeft className="h-6 w-6" />
                  <div className="flex -rotate-90 items-center gap-3 whitespace-nowrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                      Abrir pedido
                    </span>
                    <span className="rounded-full border border-current px-2 py-1 text-[10px] font-black">
                      {items.length}
                    </span>
                  </div>
                  <span className="text-sm font-black">${cartTotal.toFixed(2)}</span>
                </button>
              )}
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
                        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Estimado</p><p className="text-sm font-black uppercase text-slate-100 mt-2">{cleaning ? `Mesa libre en ${formatCountdown(cleaningEndsAt, now)}` : `Si inicias ahora: ${formatMinutes(defaultCleaningMinutes)}`}</p></div>
                        {cleaning ? (
                          <button onClick={() => handleCloseTable(order.tableNumber)} disabled={cleaningTables[order.tableNumber]} className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] disabled:opacity-50">{cleaningTables[order.tableNumber] ? "Liberando..." : "Termine de limpiar"}</button>
                        ) : (
                          <button onClick={() => handleStartCleaning(order.tableNumber)} disabled={startingCleaningTables[order.tableNumber]} className="w-full py-4 rounded-[1.4rem] bg-cyan-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] disabled:opacity-50">{startingCleaningTables[order.tableNumber] ? "Iniciando..." : "Iniciar limpieza"}</button>
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
                      <OrderActivityCard
                        key={order.id}
                        order={order}
                        expanded={Boolean(expandedOrderIds[getOrderId(order)])}
                        onToggle={() => toggleOrderExpanded(getOrderId(order))}
                      />
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
                    <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                      {todayOrdersSorted.map((order) => (
                        <OrderActivityCard
                          key={`history-${order.id}`}
                          order={order}
                          compact
                          expanded={Boolean(expandedOrderIds[getOrderId(order)])}
                          onToggle={() => toggleOrderExpanded(getOrderId(order))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      <div className="xl:hidden fixed inset-x-4 bottom-4 z-40 flex items-end justify-between gap-3">
        {activeTab === "ordenar" && items.length > 0 && !isCartOpen && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex-1 min-w-0 items-center justify-between rounded-[1.25rem] bg-cyan-400 px-4 py-3 text-slate-950 shadow-2xl shadow-cyan-950/40"
          >
            <div className="flex items-center gap-2.5">
              <PackageCheck className="h-4 w-4" />
              <div className="text-left min-w-0">
                <p className="text-[9px] font-black uppercase">Orden actual</p>
                <p className="text-[10px] font-black uppercase truncate">{items.length} items</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-black">${cartTotal.toFixed(2)}</p>
              <p className="text-[9px] font-black uppercase">Abrir</p>
            </div>
          </button>
        )}

        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-slate-800 bg-slate-950/90 text-cyan-300 shadow-2xl shadow-cyan-950/40"
            aria-label="Subir arriba"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      {activeTab === "ordenar" && isCartOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 xl:hidden"
          aria-label="Cerrar panel de orden"
          onClick={() => setIsCartOpen(false)}
        />
      )}
      {activeTab === "ordenar" && <aside className={`xl:hidden fixed inset-y-0 right-0 z-50 w-[84vw] max-w-[380px] bg-slate-950 border-l border-slate-800 transition-transform ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}><div className="h-full overflow-y-auto p-2.5 sm:p-3 custom-scrollbar"><div className="flex items-center justify-between mb-2 sm:mb-3 px-1"><div><p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Orden actual</p><p className="text-xs sm:text-sm font-black uppercase text-white mt-1">Panel de confirmacion</p></div><button onClick={() => setIsCartOpen(false)} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em]"><X className="w-4 h-4" />Cerrar</button></div>{isWaitingForAssignedDiningTable ? <div className="flex min-h-[240px] items-center justify-center rounded-[1.6rem] border border-dashed border-amber-400/20 bg-amber-400/10 p-5 text-center"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">Pedido en espera</p><p className="mt-3 text-xs font-black uppercase text-slate-100">Necesitas una mesa asignada para empezar.</p></div></div> : isCurrentTableCleaning ? <div className="flex min-h-[240px] items-center justify-center rounded-[1.6rem] border border-rose-400/20 bg-rose-400/10 p-5 text-center"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-200">Pedido bloqueado</p><p className="mt-3 text-xs font-black uppercase text-slate-100">La mesa seleccionada se esta limpiando.</p></div></div> : <OrderPanel key={`mobile-order-panel-${tableId ?? "none"}`} pax={pax} tableId={tableId} onOrderSent={(createdOrder) => { setIsCartOpen(false); handleOrderCreated(createdOrder); }} canHandleTakeout={canHandleTableTakeout} canHandleDining={canHandleDining} sourceTableId={takeoutSourceTableId ?? (Number(tableId) > 0 ? tableId : null)} />}</div></aside>}
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

const OrderActivityCard = ({
  order,
  compact = false,
  expanded = false,
  onToggle = () => {},
}) => {
  const status = getOrderStatusConfig(order?.status);
  const orderId = getOrderId(order);
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
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={expanded}
        aria-controls={orderId ? `order-${orderId}` : undefined}
      >
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
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Vista previa: {formatOrderTime(statusTime)} · {itemCount} productos
          </p>
          {Number(order?.tableNumber) === 0 && getTakeoutDestination(order) && (
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
              Destino: {getTakeoutDestination(order)}
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] ${status.badge}`}>
            {status.label}
          </span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            {expanded ? "Ocultar detalle" : "Ver detalle"}
          </span>
        </div>
      </button>

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

      {expanded && (
        <div id={orderId ? `order-${orderId}` : undefined} className="mt-4 space-y-4">
          {order?.deliveryAddress && (
            <div className="rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Direccion delivery
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                {order.deliveryAddress}
              </p>
            </div>
          )}
          {Array.isArray(order?.items) && order.items.length > 0 && (
            <div className="rounded-[1.2rem] border border-slate-800 bg-slate-900/70 p-4">
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
        {subtitle ? (
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {subtitle}
          </p>
        ) : null}
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
