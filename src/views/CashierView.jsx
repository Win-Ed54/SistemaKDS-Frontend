import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  CreditCard,
  Layers3,
  LogOut,
  Receipt,
  Search,
  SplitSquareVertical,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import useKdsSettings from "../hooks/useKdsSettings";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { logout } from "../services/authService";
import { getOrderHistory, payOrder } from "../services/api.service";
import {
  onOrderCreatedForPayment,
  onOrderDelivered,
  onOrderPaid,
  subscribeConnectionStatus,
} from "../services/signalrService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const formatTime = (value = Date.now()) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getTakeoutDestination = (order) =>
  String(order?.takeoutDestination || order?.TakeoutDestination || "").trim();

const getOrderLocationLabel = (order) => {
  if (Number(order?.tableNumber) > 0) return `Mesa ${order.tableNumber}`;

  const destination = getTakeoutDestination(order);
  return destination ? `Para llevar · ${destination}` : "Para llevar";
};

const isTakeoutPrepaymentOrder = (order, settings) =>
  Boolean(settings?.takeoutRequirePrepayment) &&
  Number(order?.tableNumber) === 0 &&
  !order?.isPaid;

const getRemainingItemQuantity = (item) => {
  const fallbackRemaining =
    Number(item?.quantity || 0) - Number(item?.paidQuantity || 0);
  return Math.max(0, Number(item?.remainingQuantity ?? fallbackRemaining ?? 0));
};

const getPaidItemQuantity = (item) =>
  Math.max(0, Number(item?.paidQuantity || 0));

const getRemainingOrderTotal = (order) =>
  order?.items?.reduce(
    (subtotal, item) => subtotal + (item.unitPrice || 0) * getRemainingItemQuantity(item),
    0,
  ) || 0;

const getGroupTotal = (orders) =>
  (orders || []).reduce((acc, order) => acc + getRemainingOrderTotal(order), 0);

const getGroupPendingSummary = (orders) => {
  const productMap = new Map();
  let totalPendingLines = 0;
  let totalPendingUnits = 0;

  (orders || []).forEach((order) => {
    (order.items || []).forEach((item) => {
      const remainingQuantity = getRemainingItemQuantity(item);
      if (remainingQuantity <= 0) return;

      totalPendingLines += 1;
      totalPendingUnits += remainingQuantity;

      const productName = item.productName || "Producto";
      const current = productMap.get(productName) || {
        productName,
        quantity: 0,
        amount: 0,
      };

      current.quantity += remainingQuantity;
      current.amount += (item.unitPrice || 0) * remainingQuantity;
      productMap.set(productName, current);
    });
  });

  return {
    totalPendingLines,
    totalPendingUnits,
    products: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity),
  };
};

const createChargeSummaryEntry = ({ type, label, amount, detail, paymentMethod }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  label,
  amount,
  detail,
  paymentMethod,
  createdAt: Date.now(),
});

const getLatestChargeTime = (recentCharges) => {
  if (!Array.isArray(recentCharges) || recentCharges.length === 0) return "Sin cobros aun";
  return formatTime(recentCharges[0]?.createdAt || Date.now());
};

const CashierView = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [chargingOrders, setChargingOrders] = useState({});
  const [paymentForms, setPaymentForms] = useState({});
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [groupMode, setGroupMode] = useState("grouped");
  const [selectedItemPayments, setSelectedItemPayments] = useState({});
  const [recentCharges, setRecentCharges] = useState([]);
  const refreshTimeoutRef = useRef(null);

  const { isConnected } = useSignalRConnection("cashier");
  const { settings } = useKdsSettings();
  const { showToast } = useToast();

  const loadCashierData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const historyRes = await getOrderHistory();
      setHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (error) {
      console.error("Error cargando caja:", error);
      if (!silent) showToast("No se pudieron cargar las cuentas pendientes", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return;

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        loadCashierData(true);
      }, 300);
    };

    loadCashierData();

    const unsubscribeDelivered = onOrderDelivered(() => {
      scheduleRefresh();
    });

    const unsubscribeCreatedForPayment = onOrderCreatedForPayment(() => {
      scheduleRefresh();
    });

    const unsubscribePaid = onOrderPaid(() => {
      scheduleRefresh();
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) scheduleRefresh();
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      unsubscribeCreatedForPayment?.();
      unsubscribeDelivered?.();
      unsubscribePaid?.();
      unsubscribeConnection?.();
    };
  }, [loadCashierData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const pendingPayments = useMemo(() => {
    return history
      .filter((order) => {
        const status = typeof order.status === "string" ? order.status.toLowerCase() : order.status;
        const isDelivered = status === 3 || status === "delivered";
        const isTakeoutPendingPrepayment =
          Boolean(settings?.takeoutRequirePrepayment) &&
          Number(order?.tableNumber) === 0 &&
          !order.isPaid;
        return (isDelivered && !order.isPaid) || isTakeoutPendingPrepayment;
      })
      .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));
  }, [history, settings?.takeoutRequirePrepayment]);

  const filteredPendingPayments = useMemo(() => {
    const normalizedQuery = tableSearch.trim().toLowerCase();
    if (!normalizedQuery) return pendingPayments;

    return pendingPayments.filter((order) => {
      const tableNumber = Number(order?.tableNumber);
      const locationLabel = getOrderLocationLabel(order).toLowerCase();
      const searchableValues = [
        Number.isFinite(tableNumber) && tableNumber > 0 ? String(tableNumber) : "",
        locationLabel,
        getTakeoutDestination(order).toLowerCase(),
        String(order?.correlativeCode || "").toLowerCase(),
        String(order?.customerName || "").toLowerCase(),
      ];

      return searchableValues.some((value) => value.includes(normalizedQuery));
    });
  }, [pendingPayments, tableSearch]);

  const groupedPendingPayments = useMemo(() => {
    const groupsByTable = new Map();
    const standaloneGroups = [];

    filteredPendingPayments.forEach((order) => {
      const tableNumber = Number(order?.tableNumber);
      const isDiningTable = Number.isFinite(tableNumber) && tableNumber > 0;

      if (!isDiningTable) {
        standaloneGroups.push({
          groupKey: `order-${order.id}`,
          locationLabel: getOrderLocationLabel(order),
          orders: [order],
        });
        return;
      }

      if (!groupsByTable.has(tableNumber)) {
        groupsByTable.set(tableNumber, {
          groupKey: `table-${tableNumber}`,
          locationLabel: `Mesa ${tableNumber}`,
          orders: [],
        });
      }

      groupsByTable.get(tableNumber).orders.push(order);
    });

    return [
      ...Array.from(groupsByTable.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => value),
      ...standaloneGroups,
    ];
  }, [filteredPendingPayments]);

  useEffect(() => {
    const validOrderIds = new Set(pendingPayments.map((order) => String(order.id)));
    const validGroupKeys = new Set(groupedPendingPayments.map((group) => group.groupKey));

    setSelectedItemPayments((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([orderId]) => validOrderIds.has(String(orderId))),
      );

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });

    setPaymentForms((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(
          ([key]) => validOrderIds.has(String(key)) || validGroupKeys.has(key),
        ),
      );

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [groupedPendingPayments, pendingPayments]);

  const getSelectedPaymentsForOrder = useCallback((order) => {
    const selectedByLine = selectedItemPayments[order.id] || {};

    return (order.items || [])
      .map((item, index) => {
        const lineIndex = Number(item?.lineIndex ?? index);
        const remainingQuantity = getRemainingItemQuantity(item);
        const selectedQuantity = Math.min(
          remainingQuantity,
          Math.max(0, Number(selectedByLine[lineIndex] || 0)),
        );

        if (selectedQuantity <= 0) return null;

        return {
          lineIndex,
          quantity: selectedQuantity,
        };
      })
      .filter(Boolean);
  }, [selectedItemPayments]);

  const getSelectedOrderTotal = useCallback((order) => {
    const selectedByLine = selectedItemPayments[order.id] || {};

    return (order.items || []).reduce((subtotal, item, index) => {
      const lineIndex = Number(item?.lineIndex ?? index);
      const remainingQuantity = getRemainingItemQuantity(item);
      const selectedQuantity = Math.min(
        remainingQuantity,
        Math.max(0, Number(selectedByLine[lineIndex] || 0)),
      );

      return subtotal + (item.unitPrice || 0) * selectedQuantity;
    }, 0);
  }, [selectedItemPayments]);

  const updateSelectedItemQuantity = (orderId, lineIndex, quantity) => {
    setSelectedItemPayments((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [lineIndex]: Math.max(0, Number(quantity) || 0),
      },
    }));
  };

  const clearSelectedItemPayments = (orderId) => {
    setSelectedItemPayments((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const registerChargeSummary = (entry) => {
    setRecentCharges((prev) => [entry, ...prev].slice(0, 6));
  };

  const handleCharge = async (order, formKey = order.id) => {
    try {
      setChargingOrders((prev) => ({ ...prev, [order.id]: true }));
      const form = paymentForms[formKey] || {};
      await payOrder(order.id, {
        paymentMethod: form.paymentMethod || "efectivo",
        receiptNumber: form.receiptNumber || "",
        documentType: form.documentType || "ticket",
        invoiceRequested: Boolean(form.invoiceRequested),
      });
      registerChargeSummary(
        createChargeSummaryEntry({
          type: "total",
          label: order.correlativeCode || order.id,
          amount: getRemainingOrderTotal(order),
          detail: `${getOrderLocationLabel(order)} · cobro completo`,
          paymentMethod: form.paymentMethod || "efectivo",
        }),
      );
      showToast(`Pedido ${order.id} cobrado correctamente`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando orden:", error);
      showToast(`No se pudo cobrar el pedido ${order.id}`, "error");
    } finally {
      setChargingOrders((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleChargeSelected = async (order, formKey = order.id) => {
    const itemPayments = getSelectedPaymentsForOrder(order);

    if (itemPayments.length === 0) {
      showToast("Selecciona al menos un producto para cobrar", "error");
      return;
    }

    try {
      setChargingOrders((prev) => ({ ...prev, [order.id]: true }));
      const form = paymentForms[formKey] || {};
      const selectedTotal = getSelectedOrderTotal(order);
      await payOrder(order.id, {
        paymentMethod: form.paymentMethod || "efectivo",
        receiptNumber: form.receiptNumber || "",
        documentType: form.documentType || "ticket",
        invoiceRequested: Boolean(form.invoiceRequested),
        itemPayments,
      });
      clearSelectedItemPayments(order.id);
      registerChargeSummary(
        createChargeSummaryEntry({
          type: "partial",
          label: order.correlativeCode || order.id,
          amount: selectedTotal,
          detail: `${getOrderLocationLabel(order)} · ${itemPayments.length} lineas cobradas`,
          paymentMethod: form.paymentMethod || "efectivo",
        }),
      );
      showToast(`Cobro parcial aplicado a ${order.correlativeCode || order.id}`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando productos seleccionados:", error);
      showToast(`No se pudieron cobrar los productos de ${order.correlativeCode || order.id}`, "error");
    } finally {
      setChargingOrders((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleChargeGroup = async (group) => {
    const orderIds = group.orders.map((order) => order.id).filter(Boolean);
    let chargedCount = 0;
    const form = paymentForms[group.groupKey] || {};
    const totalToCharge = getGroupTotal(group.orders);

    try {
      setChargingOrders((prev) =>
        orderIds.reduce((acc, id) => ({ ...acc, [id]: true }), { ...prev }),
      );

      for (const order of group.orders) {
        await payOrder(order.id, {
          paymentMethod: form.paymentMethod || "efectivo",
          receiptNumber: form.receiptNumber || "",
          documentType: form.documentType || "ticket",
          invoiceRequested: Boolean(form.invoiceRequested),
        });
        clearSelectedItemPayments(order.id);
        chargedCount += 1;
      }

      registerChargeSummary(
        createChargeSummaryEntry({
          type: "group",
          label: group.locationLabel,
          amount: totalToCharge,
          detail: `${chargedCount} pedidos cobrados en grupo`,
          paymentMethod: form.paymentMethod || "efectivo",
        }),
      );
      showToast(`${group.locationLabel} cobrada correctamente`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando grupo:", error);
      await loadCashierData(true);
      showToast(
        chargedCount > 0
          ? `${group.locationLabel}: se cobraron ${chargedCount} pedidos antes del error. La vista fue actualizada.`
          : `No se pudo cobrar ${group.locationLabel}`,
        "error",
      );
    } finally {
      setChargingOrders((prev) => {
        const next = { ...prev };
        orderIds.forEach((id) => {
          next[id] = false;
        });
        return next;
      });
    }
  };

  const isGroupCharging = (group) =>
    group.orders.some((order) => chargingOrders[order.id]);

  const updatePaymentForm = (orderId, patch) => {
    setPaymentForms((prev) => ({
      ...prev,
      [orderId]: {
        paymentMethod: "efectivo",
        documentType: "ticket",
        receiptNumber: "",
        invoiceRequested: false,
        ...(prev[orderId] || {}),
        ...patch,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-6 selection:bg-emerald-400/30">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <header className="rounded-[1.4rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.10),_transparent_24%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] px-4 py-3 shadow-2xl">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-emerald-500/30 bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter uppercase sm:text-xl">
                  KDS <span className="text-emerald-400">Caja</span>
                </h1>
                <p className="mt-0.5 text-[8px] text-slate-500 font-bold uppercase tracking-[0.24em]">
                  {settings?.takeoutRequirePrepayment ? "Cobros y prepagos" : "Cobro operativo"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CashierTopMetric
                label="Sesion"
                value={loading ? "Sync" : "Activa"}
                accent="text-slate-200"
                tone="border-slate-700 bg-slate-900/80"
              />
              <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${isConnected ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" : "border-red-500/20 bg-red-950/20 text-red-400"}`}>
                <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {isConnected ? "En linea" : "Sin conexion"}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                <Clock3 className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-[0.16em]">
                  {getLatestChargeTime(recentCharges)}
                </span>
              </div>

              <div className="h-8 w-px bg-slate-800" />
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-red-300 transition-all hover:bg-red-500 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                {settings?.takeoutRequirePrepayment
                  ? "Cobros Pendientes Y Prepagos Para Llevar"
                  : "Ordenes Pendientes De Cobro"}
              </h2>
            </div>

            <label className="relative w-full lg:w-[360px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value.slice(0, 40))}
                placeholder="Buscar mesa, para llevar, cliente o codigo"
                className="w-full rounded-[1.2rem] border border-slate-800 bg-slate-950 pl-11 pr-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setGroupMode("grouped")}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-[1.2rem] border text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                groupMode === "grouped"
                  ? "border-emerald-300 bg-emerald-400 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              }`}
            >
              <Layers3 className="w-4 h-4" />
              Cobro por mesa
            </button>
            <button
              type="button"
              onClick={() => setGroupMode("separate")}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-[1.2rem] border text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                groupMode === "separate"
                  ? "border-emerald-300 bg-emerald-400 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              }`}
            >
              <SplitSquareVertical className="w-4 h-4" />
              Cobro por pedido
            </button>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-[2rem] p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                {settings?.takeoutRequirePrepayment
                  ? "No hay cobros pendientes ni pedidos para llevar por prepagar"
                  : "No hay cuentas pendientes en este momento"}
              </p>
            </div>
          ) : filteredPendingPayments.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-[2rem] p-12 text-center space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                No se encontraron pedidos con ese criterio
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Prueba con numero de mesa, para llevar, cliente o codigo de pedido
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {groupMode === "grouped"
                  ? `Mostrando ${groupedPendingPayments.length} grupos de cobro y ${filteredPendingPayments.length} cuentas pendientes`
                  : `Mostrando ${filteredPendingPayments.length} de ${pendingPayments.length} cuentas pendientes`}
              </div>

              {groupMode === "grouped" ? (
                <GroupedPaymentsView
                  groupedPendingPayments={groupedPendingPayments}
                  paymentForms={paymentForms}
                  chargingOrders={chargingOrders}
                  updatePaymentForm={updatePaymentForm}
                  handleCharge={handleCharge}
                  handleChargeSelected={handleChargeSelected}
                  handleChargeGroup={handleChargeGroup}
                  isGroupCharging={isGroupCharging}
                  selectedItemPayments={selectedItemPayments}
                  updateSelectedItemQuantity={updateSelectedItemQuantity}
                  getSelectedOrderTotal={getSelectedOrderTotal}
                  settings={settings}
                />
              ) : (
                <SeparatePaymentsView
                  filteredPendingPayments={filteredPendingPayments}
                  paymentForms={paymentForms}
                  chargingOrders={chargingOrders}
                  updatePaymentForm={updatePaymentForm}
                  handleCharge={handleCharge}
                  handleChargeSelected={handleChargeSelected}
                  selectedItemPayments={selectedItemPayments}
                  updateSelectedItemQuantity={updateSelectedItemQuantity}
                  getSelectedOrderTotal={getSelectedOrderTotal}
                  settings={settings}
                />
              )}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Registro de caja
              </p>
              <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
                Ultimos cobros aplicados
              </h2>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              {recentCharges.length} registro{recentCharges.length === 1 ? "" : "s"}
            </div>
          </div>

          {recentCharges.length === 0 ? (
            <div className="mt-4 rounded-[1.6rem] border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Aun no hay cobros registrados en esta sesion
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
              {recentCharges.map((entry) => (
                <ChargeSummaryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const PaymentFormFields = ({ formKey, paymentForms, updatePaymentForm, placeholder }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-4">
    <label className="space-y-2">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        Metodo de pago
      </span>
      <select
        value={paymentForms[formKey]?.paymentMethod || "efectivo"}
        onChange={(event) =>
          updatePaymentForm(formKey, { paymentMethod: event.target.value })
        }
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none"
      >
        <option value="efectivo">Efectivo</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="transferencia">Transferencia</option>
      </select>
    </label>

    <label className="space-y-2">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        Tipo de comprobante
      </span>
      <select
        value={paymentForms[formKey]?.documentType || "ticket"}
        onChange={(event) =>
          updatePaymentForm(formKey, { documentType: event.target.value })
        }
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none"
      >
        <option value="ticket">Ticket</option>
        <option value="consumidor_final">Consumidor final</option>
        <option value="factura">Factura</option>
      </select>
    </label>

    <label className="space-y-2 md:col-span-2">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        Numero de comprobante
      </span>
      <input
        type="text"
        value={paymentForms[formKey]?.receiptNumber || ""}
        onChange={(event) =>
          updatePaymentForm(formKey, { receiptNumber: event.target.value.slice(0, 40) })
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-700"
      />
    </label>

    <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
      <input
        type="checkbox"
        checked={Boolean(paymentForms[formKey]?.invoiceRequested)}
        onChange={(event) =>
          updatePaymentForm(formKey, { invoiceRequested: event.target.checked })
        }
        className="h-4 w-4 rounded border-slate-700 bg-slate-900"
      />
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
        El cliente solicito factura
      </span>
    </label>
  </div>
);

const GroupedPaymentsView = ({
  groupedPendingPayments,
  paymentForms,
  chargingOrders,
  updatePaymentForm,
  handleCharge,
  handleChargeSelected,
  handleChargeGroup,
  isGroupCharging,
  selectedItemPayments,
  updateSelectedItemQuantity,
  getSelectedOrderTotal,
  settings,
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    {groupedPendingPayments.map((group) => {
      const pendingSummary = getGroupPendingSummary(group.orders);

      return (
        <article key={group.groupKey} className="bg-slate-950 border border-slate-800 rounded-[2rem] p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Ubicacion</p>
              <p className="text-4xl font-black text-white mt-1">{group.locationLabel}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mt-2">
                {pendingSummary.totalPendingLines} {pendingSummary.totalPendingLines === 1 ? "linea pendiente" : "lineas pendientes"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total mesa</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {formatCurrency(getGroupTotal(group.orders))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-[1.3rem] border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Pedidos por cobrar
              </p>
              <p className="text-2xl font-black text-cyan-300 mt-2">
                {group.orders.length}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Productos pendientes
              </p>
              <p className="text-2xl font-black text-amber-300 mt-2">
                {pendingSummary.totalPendingUnits}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Resumen para caja
                </p>
                <p className="text-sm font-black text-slate-100 mt-1">
                  {group.locationLabel} tiene {pendingSummary.totalPendingLines} lineas pendientes
                </p>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                {pendingSummary.products.length} productos distintos
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pendingSummary.products.map((product) => (
                <div
                  key={`${group.groupKey}-${product.productName}`}
                  className="rounded-[1rem] border border-slate-800 bg-slate-950/80 px-3 py-2"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                    {product.productName}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300 mt-1">
                    Pendiente: {product.quantity}
                  </p>
                  <p className="text-[10px] font-black text-emerald-300 mt-1">
                    {formatCurrency(product.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {group.orders.map((order) => {
              const isTakeoutPrepayment = isTakeoutPrepaymentOrder(order, settings);

              return (
              <div key={order.id} className="rounded-[1.4rem] border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Pedido</p>
                    <p className="text-sm font-black text-cyan-300 mt-1 break-all">
                      {order.correlativeCode || order.id}
                    </p>
                    {isTakeoutPrepayment && (
                      <span className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                        Prepago para llevar
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {isTakeoutPrepayment ? "Monto a prepagar" : "Subtotal"}
                    </p>
                    <p className="text-sm font-black text-slate-100 mt-1">
                      {formatCurrency(getRemainingOrderTotal(order))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                    <p className="text-sm font-black uppercase text-slate-100 mt-1">
                      {order.customerName || "General"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mesero</p>
                    <p className="text-sm font-black uppercase text-slate-100 mt-1">
                      {order.waiterName || "---"}
                    </p>
                  </div>
                </div>

                {Number(order?.tableNumber) === 0 && getTakeoutDestination(order) && (
                  <div className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/80">
                      Destino para llevar
                    </p>
                    <p className="mt-1 text-sm font-black uppercase text-amber-100">
                      {getTakeoutDestination(order)}
                    </p>
                  </div>
                )}

                <div className="bg-slate-950/70 border border-slate-800 rounded-[1.2rem] p-3 space-y-2">
                  {order.items?.map((item, index) => {
                    const lineIndex = Number(item?.lineIndex ?? index);
                    const remainingQuantity = getRemainingItemQuantity(item);
                    const selectedQuantity = Math.min(
                      remainingQuantity,
                      Math.max(0, Number(selectedItemPayments[order.id]?.[lineIndex] || 0)),
                    );

                    return (
                      <div key={`${order.id}-${index}`} className="rounded-[1rem] border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <span className="font-bold text-slate-200">
                              {item.quantity}x {item.productName}
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getPaidItemQuantity(item) > 0 && (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                                  Pagado: {getPaidItemQuantity(item)}
                                </span>
                              )}
                              {remainingQuantity > 0 && (
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
                                  Pendiente: {remainingQuantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-slate-400">
                            {formatCurrency((item.unitPrice || 0) * remainingQuantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Selecciona cantidad a cobrar
                          </p>
                          {remainingQuantity > 0 && (
                            <select
                              value={selectedQuantity}
                              onChange={(event) =>
                                updateSelectedItemQuantity(order.id, lineIndex, event.target.value)
                              }
                              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black text-white outline-none"
                            >
                              {Array.from({ length: remainingQuantity + 1 }, (_, option) => (
                                <option key={option} value={option}>
                                  Cobrar {option}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleChargeSelected(order, group.groupKey)}
                  disabled={chargingOrders[order.id] || getSelectedOrderTotal(order) <= 0}
                  className="w-full py-3 rounded-[1.2rem] border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-cyan-400 hover:text-slate-950 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-4 h-4" />
                  {chargingOrders[order.id]
                    ? "Cobrando seleccion..."
                    : `${isTakeoutPrepayment ? "Prepago parcial" : "Cobrar seleccionado"} ${formatCurrency(getSelectedOrderTotal(order))}`}
                </button>

                <button
                  onClick={() => handleCharge(order, group.groupKey)}
                  disabled={chargingOrders[order.id]}
                  className="w-full py-3 rounded-[1.2rem] border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-400 hover:text-slate-950 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-4 h-4" />
                  {chargingOrders[order.id]
                    ? "Cobrando..."
                    : isTakeoutPrepayment
                      ? "Cobrar prepago completo"
                      : "Cobrar solo este pedido"}
                </button>
              </div>
            )})}
          </div>

          <PaymentFormFields
            formKey={group.groupKey}
            paymentForms={paymentForms}
            updatePaymentForm={updatePaymentForm}
            placeholder={`Ej. ${group.locationLabel.replace(/\s+/g, "-").toUpperCase()}`}
          />

          <button
            onClick={() => handleChargeGroup(group)}
            disabled={isGroupCharging(group)}
            className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
          >
            <CreditCard className="w-4 h-4" />
            {isGroupCharging(group) ? "Cobrando mesa..." : `Cobrar ${group.locationLabel} completa`}
          </button>
        </article>
      );
    })}
  </div>
);

const SeparatePaymentsView = ({
  filteredPendingPayments,
  paymentForms,
  chargingOrders,
  updatePaymentForm,
  handleCharge,
  handleChargeSelected,
  selectedItemPayments,
  updateSelectedItemQuantity,
  getSelectedOrderTotal,
  settings,
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    {filteredPendingPayments.map((order) => {
      const isTakeoutPrepayment = isTakeoutPrepaymentOrder(order, settings);

      return (
      <article key={order.id} className="bg-slate-950 border border-slate-800 rounded-[2rem] p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Pedido</p>
            <p className="text-sm font-black text-cyan-300 mt-1 break-all">
              {order.correlativeCode || order.id}
            </p>
            {isTakeoutPrepayment && (
              <span className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                Prepago para llevar
              </span>
            )}
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Ubicacion</p>
            <p className="text-4xl font-black text-white mt-1">{getOrderLocationLabel(order)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {isTakeoutPrepayment ? "Monto a prepagar" : "Total"}
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {formatCurrency(getRemainingOrderTotal(order))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
            <p className="text-sm font-black uppercase text-slate-100 mt-1">
              {order.customerName || "General"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesero</p>
            <p className="text-sm font-black uppercase text-slate-100 mt-1">
              {order.waiterName || "---"}
            </p>
          </div>
        </div>

        {Number(order?.tableNumber) === 0 && getTakeoutDestination(order) && (
          <div className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/80">
              Destino para llevar
            </p>
            <p className="mt-1 text-sm font-black uppercase text-amber-100">
              {getTakeoutDestination(order)}
            </p>
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-800 rounded-[1.5rem] p-4 space-y-2">
          {order.items?.map((item, index) => {
            const lineIndex = Number(item?.lineIndex ?? index);
            const remainingQuantity = getRemainingItemQuantity(item);
            const selectedQuantity = Math.min(
              remainingQuantity,
              Math.max(0, Number(selectedItemPayments[order.id]?.[lineIndex] || 0)),
            );

            return (
              <div key={`${order.id}-${index}`} className="rounded-[1rem] border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-bold text-slate-200">
                      {item.quantity}x {item.productName}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getPaidItemQuantity(item) > 0 && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                          Pagado: {getPaidItemQuantity(item)}
                        </span>
                      )}
                      {remainingQuantity > 0 && (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
                          Pendiente: {remainingQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-black text-slate-400">
                    {formatCurrency((item.unitPrice || 0) * remainingQuantity)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Selecciona cantidad a cobrar
                  </p>
                  {remainingQuantity > 0 && (
                    <select
                      value={selectedQuantity}
                      onChange={(event) =>
                        updateSelectedItemQuantity(order.id, lineIndex, event.target.value)
                      }
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-black text-white outline-none"
                    >
                      {Array.from({ length: remainingQuantity + 1 }, (_, option) => (
                        <option key={option} value={option}>
                          Cobrar {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <PaymentFormFields
          formKey={order.id}
          paymentForms={paymentForms}
          updatePaymentForm={updatePaymentForm}
          placeholder={`Ej. ${order.correlativeCode || "REC-001"}`}
        />

        <button
          onClick={() => handleChargeSelected(order)}
          disabled={chargingOrders[order.id] || getSelectedOrderTotal(order) <= 0}
          className="w-full py-4 rounded-[1.4rem] border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-cyan-400 hover:text-slate-950 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
        >
          <CreditCard className="w-4 h-4" />
          {chargingOrders[order.id]
            ? "Cobrando seleccion..."
            : `${isTakeoutPrepayment ? "Prepago parcial" : "Cobrar seleccionado"} ${formatCurrency(getSelectedOrderTotal(order))}`}
        </button>

        <button
          onClick={() => handleCharge(order)}
          disabled={chargingOrders[order.id]}
          className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
        >
          <CreditCard className="w-4 h-4" />
          {chargingOrders[order.id]
            ? "Cobrando..."
            : isTakeoutPrepayment
              ? "Cobrar prepago completo"
              : "Cobrar orden"}
        </button>
      </article>
    )})}
  </div>
);

const ChargeSummaryCard = ({ entry }) => {
  const toneMap = {
    total: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    partial: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    group: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  };

  return (
    <article className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] ${toneMap[entry.type] || toneMap.total}`}>
            {entry.type === "partial" ? "Parcial" : entry.type === "group" ? "Mesa completa" : "Cobro total"}
          </span>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">
            {entry.label}
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            {entry.detail}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            Hora
          </p>
          <p className="mt-2 text-sm font-black text-slate-200">
            {formatTime(entry.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.2rem] border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
            Metodo
          </p>
          <p className="mt-2 text-[10px] font-black uppercase text-slate-200">
            {entry.paymentMethod || "efectivo"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
            Monto
          </p>
          <p className="mt-2 text-lg font-black text-emerald-300">
            {formatCurrency(entry.amount)}
          </p>
        </div>
      </div>
    </article>
  );
};

export default CashierView;

const CashierTopMetric = ({ label, value, accent, tone }) => (
  <div className={`inline-flex h-9 min-w-[104px] items-center justify-between gap-3 rounded-full border px-3 ${tone}`}>
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className={`text-sm font-black tracking-tighter tabular-nums ${accent}`}>{value}</p>
  </div>
);
