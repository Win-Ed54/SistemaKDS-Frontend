import React, { useEffect, useState } from "react";
import { updateKdsSettings } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import {
  normalizeOrderSettings,
  ORDER_MODE_DEFAULTS,
  ORDER_MODES,
} from "../../constants/orderLimits";

const MODE_LABELS = {
  [ORDER_MODES.QUICK_SERVICE]: "Comida rapida",
  [ORDER_MODES.RESTAURANT]: "Restaurante",
};

const SettingInput = ({ name, label, value, onChange }) => (
  <div>
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      name={name}
      type="number"
      min="1"
      value={value}
      onChange={onChange}
      className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all"
    />
  </div>
);

const KdsSettingsPanel = ({ settings, onSaved }) => {
  const [form, setForm] = useState(() => normalizeOrderSettings(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    setForm(normalizeOrderSettings(settings));
  }, [settings]);

  const handleModeChange = (event) => {
    const mode = event.target.value;
    setForm(normalizeOrderSettings(ORDER_MODE_DEFAULTS[mode]));
  };

  const handleNumberChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setForm((prev) => ({ ...prev, [event.target.name]: Number.isNaN(value) ? 0 : value }));
  };

  const handleSubmit = async () => {
    if (form.maxDistinctItems < 1 || form.maxTotalUnits < 1 || form.maxQuantityPerProduct < 1) {
      const message = "Todos los limites deben ser mayores a cero.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (form.largeOrderUnitsWarning > form.maxTotalUnits) {
      const message = "La alerta de orden grande no puede superar el maximo de unidades.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved = await updateKdsSettings(form);
      onSaved?.(saved);
    } catch (err) {
      const message = err.message || "No se pudo guardar la configuracion.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-fuchsia-400 rounded-full shadow-[0_0_10px_#e879f9]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Configuracion KDS
          </h2>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Modo activo: {MODE_LABELS[form.serviceMode]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Tipo de operacion
            </label>
            <select
              value={form.serviceMode}
              onChange={handleModeChange}
              className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all"
            >
              <option value={ORDER_MODES.QUICK_SERVICE}>Comida rapida</option>
              <option value={ORDER_MODES.RESTAURANT}>Restaurante</option>
            </select>
          </div>

          <button
            onClick={() => setForm(normalizeOrderSettings(ORDER_MODE_DEFAULTS[form.serviceMode]))}
            className="w-full py-3 rounded-xl border border-fuchsia-400/40 text-fuchsia-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-fuchsia-400/10 transition-all"
          >
            Aplicar limites sugeridos para este modo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SettingInput name="maxDistinctItems" label="Items distintos" value={form.maxDistinctItems} onChange={handleNumberChange} />
          <SettingInput name="maxTotalUnits" label="Unidades totales" value={form.maxTotalUnits} onChange={handleNumberChange} />
          <SettingInput name="maxQuantityPerProduct" label="Max por producto" value={form.maxQuantityPerProduct} onChange={handleNumberChange} />
          <SettingInput name="largeOrderUnitsWarning" label="Alerta orden grande" value={form.largeOrderUnitsWarning} onChange={handleNumberChange} />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-[11px] font-black uppercase bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-3 rounded-xl bg-fuchsia-400/15 border border-fuchsia-400 text-fuchsia-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-fuchsia-400/20 transition-all disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar configuracion"}
        </button>
      </div>
    </section>
  );
};

export default KdsSettingsPanel;
