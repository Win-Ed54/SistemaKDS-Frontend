import React, { useMemo, useState } from "react";

const STATUS_LABELS = {
  0: "Creada",
  1: "En cocina",
  2: "Lista",
  3: "Entregada",
  4: "Cancelada",
  pending: "Creada",
  preparing: "En cocina",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

const STATUS_TONES = {
  0: "border-slate-700 bg-slate-800 text-slate-200",
  1: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  2: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  3: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  4: "border-red-400/20 bg-red-400/10 text-red-300",
  pending: "border-slate-700 bg-slate-800 text-slate-200",
  preparing: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  ready: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  delivered: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-300",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("es-SV", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "---";

const getStatusNumber = (status) => {
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

const getStatusLabel = (status) => {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalizedStatus] || STATUS_LABELS[getStatusNumber(status)] || "Orden";
};

const getOrderTimestamp = (order) => order?.paidAt || order?.deliveredAt || order?.createdAt;

const getItemCount = (order) =>
  Array.isArray(order?.items)
    ? order.items.reduce((count, item) => count + Number(item?.quantity || 0), 0)
    : 0;

const AdministrativeLog = ({ orders, history }) => {
  const [filter, setFilter] = useState("todos");
  const [expandedOrders, setExpandedOrders] = useState({});

  const allOrders = useMemo(() => {
    const map = new Map();

    [...history, ...orders].forEach((order) => {
      map.set(order.id, order);
    });

    return Array.from(map.values()).sort((left, right) => {
      const leftDate = new Date(getOrderTimestamp(left) || 0).getTime();
      const rightDate = new Date(getOrderTimestamp(right) || 0).getTime();
      return rightDate - leftDate;
    });
  }, [history, orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "pagadas") return allOrders.filter((order) => order.isPaid);
    if (filter === "canceladas") {
      return allOrders.filter((order) => getStatusNumber(order.status) === 4);
    }
    return allOrders;
  }, [allOrders, filter]);

  const summary = useMemo(() => {
    const paidOrders = allOrders.filter((order) => order.isPaid);
    const cancelledOrders = allOrders.filter((order) => getStatusNumber(order.status) === 4);
    const paidAmount = paidOrders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);

    return {
      created: allOrders.length,
      paid: paidOrders.length,
      cancelled: cancelledOrders.length,
      paidAmount,
    };
  }, [allOrders]);

  const visibleOrders = filteredOrders.slice(0, 8);

  const toggleExpanded = (orderId) => {
    if (!orderId) return;

    setExpandedOrders((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Registro administrativo
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-tighter text-white">
              Resumen de ordenes creadas, canceladas y cobradas
            </h2>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Vista compacta para revisar movimientos sin llenar la pantalla.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "todos", label: "Todo" },
              { id: "pagadas", label: "Cobradas" },
              { id: "canceladas", label: "Canceladas" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                  filter === option.id
                    ? "border-cyan-300 bg-cyan-400 text-slate-950"
                    : "border-slate-800 bg-slate-950 text-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Creadas" value={summary.created} accent="text-white" />
          <SummaryCard label="Cobradas" value={summary.paid} accent="text-emerald-400" />
          <SummaryCard label="Canceladas" value={summary.cancelled} accent="text-red-400" />
          <SummaryCard label="Total cobrado" value={formatMoney(summary.paidAmount)} accent="text-cyan-300" isAmount />
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            No hay movimientos para mostrar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Mostrando {visibleOrders.length} de {filteredOrders.length} movimientos recientes
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {visibleOrders.map((order) => {
              const orderId = order.id || order._id || order.correlativeCode;
              const isExpanded = Boolean(expandedOrders[orderId]);
              const itemCount = getItemCount(order);
              const orderStatus = getStatusNumber(order.status);
              const statusTone = STATUS_TONES[order.status] || STATUS_TONES[orderStatus] || STATUS_TONES.pending;
              const orderDate = getOrderTimestamp(order);
              const productPreview = Array.isArray(order.items) ? order.items.slice(0, 3) : [];

              return (
                <article key={orderId} className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(orderId)}
                    className="flex w-full items-start justify-between gap-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {order.tableNumber > 0 ? `Mesa ${order.tableNumber}` : "Para llevar"}
                      </p>
                      <p className="mt-1 text-sm font-black text-cyan-300 break-all">
                        {order.correlativeCode || order.id}
                      </p>
                      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Cliente
                      </p>
                      <p className="mt-1 text-sm font-black uppercase text-white break-words">
                        {order.customerName || "General"}
                      </p>
                      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {getStatusLabel(order.status)} · {itemCount} productos · {formatDateTime(orderDate)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] ${statusTone}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="mt-3 text-2xl font-black text-emerald-400">
                        {formatMoney(order.totalAmount)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-300">
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <AuditDatum label="Fecha creación" value={formatDateTime(order.createdAt)} />
                        <AuditDatum label="Fecha cobro" value={formatDateTime(order.paidAt)} />
                        <AuditDatum label="Método pago" value={order.paymentMethod || "---"} />
                        <AuditDatum label="Comprobante" value={order.receiptNumber || "---"} />
                        <AuditDatum label="Documento" value={order.documentType || "---"} />
                        <AuditDatum label="Factura" value={order.invoiceRequested ? "Sí" : "No"} />
                        <AuditDatum label="Creó la orden" value={order.waiterName || "---"} />
                        <AuditDatum label="Cobro" value={order.paidByName || "---"} />
                      </div>

                      {productPreview.length > 0 && (
                        <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Productos visibles
                          </p>
                          <div className="mt-3 space-y-2">
                            {productPreview.map((item, index) => (
                              <div
                                key={`${orderId}-preview-${index}`}
                                className="flex items-start justify-between gap-3 rounded-[1rem] border border-slate-800 bg-slate-900/60 px-3 py-2"
                              >
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
                                    {item.quantity}x {item.productName}
                                  </p>
                                  {item.notes && (
                                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-300">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-slate-400">
                                  {formatMoney((item.unitPrice || 0) * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

const SummaryCard = ({ label, value, accent, isAmount = false }) => (
  <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/80 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
    <p className={`mt-3 ${isAmount ? "text-2xl" : "text-3xl"} font-black ${accent}`}>
      {value}
    </p>
  </div>
);

const AuditDatum = ({ label, value }) => (
  <div className="rounded-[1.2rem] border border-slate-800 bg-slate-950/60 p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-xs font-black uppercase text-slate-200">{value}</p>
  </div>
);

export default AdministrativeLog;
