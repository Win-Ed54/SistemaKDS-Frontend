import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import useSignalRConnection from "../hooks/useSignalRConnection";
import { logout } from "../services/authService";
import { getOrderHistory, payOrder } from "../services/api.service";
import {
  onOrderDelivered,
  onOrderPaid,
  subscribeConnectionStatus,
} from "../services/signalrService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const getOrderLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

const getOrderTotal = (order) =>
  order?.items?.reduce(
    (subtotal, item) => subtotal + (item.unitPrice || 0) * item.quantity,
    0,
  ) || 0;

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

const CashierView = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [chargingOrders, setChargingOrders] = useState({});
  const [paymentForms, setPaymentForms] = useState({});
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [groupMode, setGroupMode] = useState("grouped");
  const [selectedItemPayments, setSelectedItemPayments] = useState({});

  const { isConnected } = useSignalRConnection("cashier");
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
    loadCashierData();

    const unsubscribeDelivered = onOrderDelivered(() => {
      loadCashierData(true);
    });

    const unsubscribePaid = onOrderPaid(() => {
      loadCashierData(true);
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) loadCashierData(true);
    });

    return () => {
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
        return isDelivered && !order.isPaid;
      })
      .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));
  }, [history]);

  const filteredPendingPayments = useMemo(() => {
    const normalizedQuery = tableSearch.trim().toLowerCase();
    if (!normalizedQuery) return pendingPayments;

    return pendingPayments.filter((order) => {
      const tableNumber = Number(order?.tableNumber);
      const locationLabel = getOrderLocationLabel(order).toLowerCase();
      const searchableValues = [
        Number.isFinite(tableNumber) && tableNumber > 0 ? String(tableNumber) : "",
        locationLabel,
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

  const totals = useMemo(() => {
    const totalOrders = pendingPayments.length;
    const totalAmount = pendingPayments.reduce((acc, order) => acc + getRemainingOrderTotal(order), 0);

    return { totalOrders, totalAmount };
  }, [pendingPayments]);

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

  const handleCharge = async (order) => {
    try {
      setChargingOrders((prev) => ({ ...prev, [order.id]: true }));
      const form = paymentForms[order.id] || {};
      await payOrder(order.id, {
        paymentMethod: form.paymentMethod || "efectivo",
        receiptNumber: form.receiptNumber || "",
        documentType: form.documentType || "ticket",
        invoiceRequested: Boolean(form.invoiceRequested),
      });
      showToast(`Pedido ${order.id} cobrado correctamente`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando orden:", error);
      showToast(`No se pudo cobrar el pedido ${order.id}`, "error");
    } finally {
      setChargingOrders((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleChargeSelected = async (order) => {
    const itemPayments = getSelectedPaymentsForOrder(order);

    if (itemPayments.length === 0) {
      showToast("Selecciona al menos un producto para cobrar", "error");
      return;
    }

    try {
      setChargingOrders((prev) => ({ ...prev, [order.id]: true }));
      const form = paymentForms[order.id] || {};
      await payOrder(order.id, {
        paymentMethod: form.paymentMethod || "efectivo",
        receiptNumber: form.receiptNumber || "",
        documentType: form.documentType || "ticket",
        invoiceRequested: Boolean(form.invoiceRequested),
        itemPayments,
      });
      clearSelectedItemPayments(order.id);
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

    try {
      setChargingOrders((prev) =>
        orderIds.reduce((acc, id) => ({ ...acc, [id]: true }), { ...prev }),
      );

      const form = paymentForms[group.groupKey] || {};

      for (const order of group.orders) {
        await payOrder(order.id, {
          paymentMethod: form.paymentMethod || "efectivo",
          receiptNumber: form.receiptNumber || "",
          documentType: form.documentType || "ticket",
          invoiceRequested: Boolean(form.invoiceRequested),
        });
      }

      showToast(`${group.locationLabel} cobrada correctamente`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando grupo:", error);
      showToast(`No se pudo cobrar ${group.locationLabel}`, "error");
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
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 selection:bg-emerald-400/30">
      <div className="max-w-[1500px] mx-auto space-y-8">
        <header className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">
                KDS <span className="text-emerald-400">Caja</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
                Cobro de productos entregados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnected ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" : "border-red-500/20 bg-red-950/20 text-red-400"}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {isConnected ? "En linea" : "Sin conexion"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesion
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Cuentas pendientes</p>
            <p className="text-4xl font-black text-white mt-3">{totals.totalOrders}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Total por cobrar</p>
            <p className="text-4xl font-black text-emerald-400 mt-3">{formatCurrency(totals.totalAmount)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Estado</p>
            <p className="text-xl font-black text-slate-200 mt-4">
              {loading ? "Actualizando..." : "Caja sincronizada"}
            </p>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                Ordenes Pendientes De Cobro
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
                placeholder="Buscar mesa, cliente o codigo"
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
                No hay cuentas pendientes en este momento
              </p>
            </div>
          ) : filteredPendingPayments.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-[2rem] p-12 text-center space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                No se encontraron mesas con ese criterio
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Prueba con numero de mesa, cliente o codigo de pedido
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
                />
              )}
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
                {group.orders.length} {group.orders.length === 1 ? "orden" : "ordenes"} pendientes
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total mesa</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {formatCurrency(getGroupTotal(group.orders))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-[1.3rem] border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Total pendiente
              </p>
              <p className="text-2xl font-black text-emerald-300 mt-2">
                {formatCurrency(getGroupTotal(group.orders))}
              </p>
            </div>
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
            {group.orders.map((order) => (
              <div key={order.id} className="rounded-[1.4rem] border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Pedido</p>
                    <p className="text-sm font-black text-cyan-300 mt-1 break-all">
                      {order.correlativeCode || order.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Subtotal</p>
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
                  onClick={() => handleChargeSelected(order)}
                  disabled={chargingOrders[order.id] || getSelectedOrderTotal(order) <= 0}
                  className="w-full py-3 rounded-[1.2rem] border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-cyan-400 hover:text-slate-950 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-4 h-4" />
                  {chargingOrders[order.id]
                    ? "Cobrando seleccion..."
                    : `Cobrar seleccionado ${formatCurrency(getSelectedOrderTotal(order))}`}
                </button>

                <button
                  onClick={() => handleCharge(order)}
                  disabled={chargingOrders[order.id]}
                  className="w-full py-3 rounded-[1.2rem] border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-400 hover:text-slate-950 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-4 h-4" />
                  {chargingOrders[order.id] ? "Cobrando..." : "Cobrar solo este pedido"}
                </button>
              </div>
            ))}
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
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    {filteredPendingPayments.map((order) => (
      <article key={order.id} className="bg-slate-950 border border-slate-800 rounded-[2rem] p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Pedido</p>
            <p className="text-sm font-black text-cyan-300 mt-1 break-all">
              {order.correlativeCode || order.id}
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Ubicacion</p>
            <p className="text-4xl font-black text-white mt-1">{getOrderLocationLabel(order)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total</p>
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
            : `Cobrar seleccionado ${formatCurrency(getSelectedOrderTotal(order))}`}
        </button>

        <button
          onClick={() => handleCharge(order)}
          disabled={chargingOrders[order.id]}
          className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
        >
          <CreditCard className="w-4 h-4" />
          {chargingOrders[order.id] ? "Cobrando..." : "Cobrar orden"}
        </button>
      </article>
    ))}
  </div>
);

export default CashierView;
