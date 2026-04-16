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

const AdministrativeLog = ({ orders, history }) => {
  const [filter, setFilter] = useState("todos");

  const allOrders = useMemo(() => {
    const map = new Map();
    [...history, ...orders].forEach((order) => {
      map.set(order.id, order);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aDate = new Date(a.paidAt || a.deliveredAt || a.createdAt);
      const bDate = new Date(b.paidAt || b.deliveredAt || b.createdAt);
      return bDate - aDate;
    });
  }, [history, orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "pagadas") return allOrders.filter((order) => order.isPaid);
    if (filter === "canceladas") {
      return allOrders.filter((order) => {
        const status = typeof order.status === "string" ? order.status.toLowerCase() : order.status;
        return status === 4 || status === "cancelled";
      });
    }
    if (filter === "creadas") return allOrders;
    return allOrders;
  }, [allOrders, filter]);

  const summary = useMemo(
    () => ({
      created: allOrders.length,
      paid: allOrders.filter((order) => order.isPaid).length,
      cancelled: allOrders.filter((order) => {
        const status = typeof order.status === "string" ? order.status.toLowerCase() : order.status;
        return status === 4 || status === "cancelled";
      }).length,
    }),
    [allOrders],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Registro administrativo
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-tighter text-white">
              Ordenes creadas, canceladas y cobradas
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "todos", label: "Todo" },
              { id: "creadas", label: "Creadas" },
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Creadas" value={summary.created} accent="text-white" />
          <SummaryCard label="Cobradas" value={summary.paid} accent="text-emerald-400" />
          <SummaryCard label="Canceladas" value={summary.cancelled} accent="text-red-400" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Correlativo
                </p>
                <p className="mt-1 text-sm font-black text-cyan-300">
                  {order.correlativeCode || order.id}
                </p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Cliente
                </p>
                <p className="mt-1 text-sm font-black uppercase text-white">
                  {order.customerName || "General"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Estado
                </p>
                <p className="mt-1 text-sm font-black uppercase text-slate-200">
                  {STATUS_LABELS[String(order.status).toLowerCase()] || STATUS_LABELS[order.status] || "Orden"}
                </p>
                <p className="mt-3 text-2xl font-black text-emerald-400">
                  {formatMoney(order.totalAmount)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AuditDatum label="Fecha creacion" value={formatDateTime(order.createdAt)} />
              <AuditDatum label="Fecha cobro" value={formatDateTime(order.paidAt)} />
              <AuditDatum label="Ventas gravadas" value={formatMoney(order.taxableAmount)} />
              <AuditDatum label="IVA cobrado" value={formatMoney(order.taxAmount)} />
              <AuditDatum label="Metodo pago" value={order.paymentMethod || "---"} />
              <AuditDatum label="Comprobante" value={order.receiptNumber || "---"} />
              <AuditDatum label="Documento" value={order.documentType || "---"} />
              <AuditDatum label="Factura" value={order.invoiceRequested ? "Si" : "No"} />
              <AuditDatum label="Creo la orden" value={order.waiterName || "---"} />
              <AuditDatum label="Preparo" value={order.preparedByName || "---"} />
              <AuditDatum label="Cobro" value={order.paidByName || "---"} />
              <AuditDatum label="Cancelo" value={order.cancelledByName || "---"} />
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Detalle de productos
              </p>
              <div className="mt-3 space-y-2">
                {order.items?.map((item, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-200">
                        {item.quantity}x {item.productName}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] font-black uppercase text-yellow-300">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-slate-400">
                      {formatMoney((item.unitPrice || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const SummaryCard = ({ label, value, accent }) => (
  <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/80 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
    <p className={`mt-3 text-3xl font-black ${accent}`}>{value}</p>
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
