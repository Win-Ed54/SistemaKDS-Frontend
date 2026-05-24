import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  DollarSign,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { makeAuthenticatedRequest } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const PERIOD_LABELS = {
  day: "Hoy",
  week: "Semana",
  month: "Mes",
};

const PREVIEW_LIMIT = 5;

const getWeekRange = (value) => {
  const baseDate = new Date(value);
  const day = baseDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);

const formatPercent = (value) => {
  const numeric = Number(value) || 0;
  const sign = numeric >= 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
};

const formatDisplayDate = (value, options) =>
  new Date(value).toLocaleDateString("es-SV", options);

const getPeriodLabel = (period, selectedDate) => {
  if (period === "day") {
    return formatDisplayDate(selectedDate, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (period === "month") {
    return formatDisplayDate(selectedDate, {
      month: "long",
      year: "numeric",
    });
  }

  const { start, end } = getWeekRange(selectedDate);
  return `${formatDisplayDate(start, { month: "short", day: "numeric" })} - ${formatDisplayDate(end, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

const RevenueAnalytics = () => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState("week");
  const [analytics, setAnalytics] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedSection, setExpandedSection] = useState("daily");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const baseDate = new Date(selectedDate);
        let endpoint = "";

        if (period === "day") {
          endpoint = `/analytics/daily?date=${selectedDate}`;
        } else if (period === "month") {
          endpoint = `/analytics/month?month=${baseDate.getMonth() + 1}&year=${baseDate.getFullYear()}`;
        } else {
          const { start, end } = getWeekRange(selectedDate);
          endpoint = `/analytics/week?startDate=${start.toISOString().split("T")[0]}&endDate=${end.toISOString().split("T")[0]}`;
        }

        const data = await makeAuthenticatedRequest(endpoint);
        setAnalytics(data);
      } catch {
        showToast("Error al cargar analisis", "error");
      }
    };

    void loadAnalytics();
  }, [period, selectedDate, showToast]);

  const periodLabel = useMemo(
    () => getPeriodLabel(period, selectedDate),
    [period, selectedDate],
  );

  const inputType = period === "month" ? "month" : "date";
  const inputValue =
    period === "month" ? selectedDate.slice(0, 7) : selectedDate;

  const handleDateChange = (event) => {
    const nextValue = event.target.value;
    if (period === "month") {
      setSelectedDate(`${nextValue}-01`);
      return;
    }

    setSelectedDate(nextValue);
  };

  if (!analytics) {
    return (
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-8 text-center shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
          Cargando analisis
        </p>
      </div>
    );
  }

  const previousRevenue = analytics.periodComparison?.previousRevenue || 0;
  const previousOrders = analytics.periodComparison?.previousOrders || 0;
  const averageOrderValueBase = analytics.averageOrderValue - (analytics.averageOrderValueChange || 0);
  const averageOrderValueChangePercent =
    averageOrderValueBase > 0
      ? ((analytics.averageOrderValueChange || 0) / averageOrderValueBase) * 100
      : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Rendimiento comercial
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white">
                {PERIOD_LABELS[period]} en foco
              </h2>
            </div>

            <div className="inline-flex items-center gap-3 rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-cyan-200">
              <Calendar className="h-5 w-5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300/80">
                  Periodo activo
                </p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-white">
                  {periodLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-slate-800 bg-slate-950/80 p-2">
              {["day", "week", "month"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeriod(option)}
                  className={`rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    period === option
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  {PERIOD_LABELS[option]}
                </button>
              ))}
            </div>

            <label className="flex min-w-[180px] items-center gap-3 rounded-[1.4rem] border border-slate-800 bg-slate-950/80 px-4 py-3">
              <Calendar className="h-4 w-4 text-cyan-300" />
              <input
                type={inputType}
                value={inputValue}
                onChange={handleDateChange}
                className="w-full bg-transparent text-sm font-black uppercase tracking-[0.08em] text-white outline-none"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Ingresos"
          value={formatCurrency(analytics.totalRevenue)}
          change={analytics.periodComparison?.revenueChangePercentage}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
          subtitle={`Antes: ${formatCurrency(previousRevenue)}`}
        />
        <KPICard
          title="Ordenes"
          value={analytics.totalOrders}
          change={analytics.periodComparison?.orderChangePercentage}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="cyan"
          subtitle={`Antes: ${previousOrders}`}
        />
        <KPICard
          title="Ticket promedio"
          value={formatCurrency(analytics.averageOrderValue)}
          change={averageOrderValueChangePercent}
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
          subtitle="Valor medio por pedido"
        />
        <KPICard
          title="Periodo anterior"
          value={formatCurrency(previousRevenue)}
          icon={<BarChart3 className="h-5 w-5" />}
          color="slate"
          subtitle={`${previousOrders} ordenes`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <CollapsibleSection
            title="Desglose diario"
            description="Muestra solo los dias mas relevantes primero."
            badge={`${analytics.dailyRevenue?.length || 0} dias`}
            isExpanded={expandedSection === "daily"}
            onToggle={() => setExpandedSection(expandedSection === "daily" ? null : "daily")}
          >
            <PreviewList
              rows={analytics.dailyRevenue || []}
              emptyLabel="No hay dias registrados para este periodo."
              renderRow={(day) => ({
                id: day.date,
                title: formatDisplayDate(day.date, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }),
                subtitle: `${day.orderCount} ordenes`,
                value: formatCurrency(day.revenue),
                helper: `Promedio ${formatCurrency(day.averageOrderValue)}`,
              })}
            />
          </CollapsibleSection>
        </div>

        <div className="xl:col-span-5">
          <CollapsibleSection
            title="Comparacion"
            description="Resumen del periodo actual frente al anterior."
            badge="Tendencia"
            isExpanded={expandedSection === "comparison"}
            onToggle={() => setExpandedSection(expandedSection === "comparison" ? null : "comparison")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ComparisonCard
                label="Periodo actual"
                period={analytics.periodComparison?.currentPeriod}
                revenue={analytics.totalRevenue}
                orders={analytics.totalOrders}
                accent="text-emerald-300"
              />
              <ComparisonCard
                label="Periodo anterior"
                period={analytics.periodComparison?.previousPeriod}
                revenue={previousRevenue}
                orders={previousOrders}
                accent="text-slate-300"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TrendPill
                label="Cambio de ingresos"
                value={formatPercent(analytics.periodComparison?.revenueChangePercentage)}
                positive={(analytics.periodComparison?.revenueChangePercentage || 0) >= 0}
              />
              <TrendPill
                label="Cambio de ordenes"
                value={formatPercent(analytics.periodComparison?.orderChangePercentage)}
                positive={(analytics.periodComparison?.orderChangePercentage || 0) >= 0}
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <CollapsibleSection
            title="Horas pico"
            description="Primero se muestran las horas con mayor impacto."
            badge={`${analytics.hourlyBreakdown?.length || 0} bloques`}
            isExpanded={expandedSection === "hourly"}
            onToggle={() => setExpandedSection(expandedSection === "hourly" ? null : "hourly")}
          >
            <PreviewList
              rows={[...(analytics.hourlyBreakdown || [])].sort((a, b) => b.revenue - a.revenue)}
              emptyLabel="No hay actividad por hora para este periodo."
              renderRow={(hour) => ({
                id: hour.hour,
                title: `${String(hour.hour).padStart(2, "0")}:00`,
                subtitle: `${hour.orderCount} ordenes`,
                value: formatCurrency(hour.revenue),
                helper: "Bloque horario",
              })}
            />
          </CollapsibleSection>
        </div>

        <div className="xl:col-span-7">
          <CollapsibleSection
            title="Productos mas vendidos"
            description="Se prioriza el top inicial y el resto se expande a demanda."
            badge={`${analytics.topProducts?.length || 0} productos`}
            isExpanded={expandedSection === "products"}
            onToggle={() => setExpandedSection(expandedSection === "products" ? null : "products")}
          >
            <PreviewList
              rows={analytics.topProducts || []}
              emptyLabel="No hay productos vendidos en este periodo."
              renderRow={(product, index) => ({
                id: product.productId || `${product.productName}-${index}`,
                title: `${index + 1}. ${product.productName}`,
                subtitle: `${product.quantitySold} unidades`,
                value: formatCurrency(product.totalSales),
                helper: `${formatCurrency(product.averagePrice)} por unidad`,
              })}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, change, icon, color, subtitle }) => {
  const colorClasses = {
    emerald: "border-emerald-500/20 bg-[linear-gradient(135deg,_rgba(16,185,129,0.14)_0%,_rgba(2,6,23,0.95)_100%)]",
    cyan: "border-cyan-500/20 bg-[linear-gradient(135deg,_rgba(34,211,238,0.14)_0%,_rgba(2,6,23,0.95)_100%)]",
    blue: "border-blue-500/20 bg-[linear-gradient(135deg,_rgba(59,130,246,0.14)_0%,_rgba(2,6,23,0.95)_100%)]",
    slate: "border-slate-700 bg-[linear-gradient(135deg,_rgba(100,116,139,0.14)_0%,_rgba(2,6,23,0.95)_100%)]",
  };

  const textColors = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    blue: "text-blue-300",
    slate: "text-slate-200",
  };

  return (
    <article className={`rounded-[1.8rem] border p-5 shadow-xl ${colorClasses[color]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className={`mt-3 text-3xl font-black tracking-tighter ${textColors[color]}`}>{value}</p>
          {subtitle ? (
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {subtitle}
            </p>
          ) : null}
          {change !== undefined ? (
            <p
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                Number(change) >= 0
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-red-400/20 bg-red-400/10 text-red-300"
              }`}
            >
              {Number(change) >= 0 ? "Sube" : "Baja"} {Math.abs(Number(change) || 0).toFixed(1)}%
            </p>
          ) : null}
        </div>
        <div className="rounded-[1.2rem] border border-slate-800 bg-slate-950/80 p-3 text-slate-200">
          {icon}
        </div>
      </div>
    </article>
  );
};

const CollapsibleSection = ({ title, description, badge, isExpanded, onToggle, children }) => (
  <section className="rounded-[1.8rem] border border-slate-800 bg-slate-900/60 shadow-xl">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-900/40"
    >
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
          Analitica
        </p>
        <h3 className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-white">{title}</h3>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
          {badge}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>
    </button>
    {isExpanded ? <div className="border-t border-slate-800 px-5 py-4">{children}</div> : null}
  </section>
);

const PreviewList = ({ rows, renderRow, emptyLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, PREVIEW_LIMIT);

  if (!rows.length) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleRows.map((row, index) => {
        const parsed = renderRow(row, index);
        return (
          <div
            key={parsed.id}
            className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-slate-800 bg-slate-950/75 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-slate-100">
                {parsed.title}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {parsed.subtitle}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-cyan-300">
                {parsed.value}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {parsed.helper}
              </p>
            </div>
          </div>
        );
      })}

      {rows.length > PREVIEW_LIMIT ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 transition-all hover:border-cyan-400/40 hover:text-cyan-200"
        >
          {expanded ? "Ver menos" : `Ver ${rows.length - PREVIEW_LIMIT} mas`}
        </button>
      ) : null}
    </div>
  );
};

const ComparisonCard = ({ label, period, revenue, orders, accent }) => (
  <article className="rounded-[1.4rem] border border-slate-800 bg-slate-950/75 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
      {period || "Sin referencia"}
    </p>
    <p className={`mt-4 text-2xl font-black tracking-tighter ${accent}`}>{formatCurrency(revenue)}</p>
    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
      {orders} ordenes
    </p>
  </article>
);

const TrendPill = ({ label, value, positive }) => (
  <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/75 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p
      className={`mt-3 text-xl font-black uppercase tracking-[0.12em] ${
        positive ? "text-emerald-300" : "text-red-300"
      }`}
    >
      {value}
    </p>
  </div>
);

export default RevenueAnalytics;
