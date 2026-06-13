import React, { useMemo, useState } from "react";
import { ChefHat, FlaskConical, Plus, Trash2 } from "lucide-react";
import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
  updateProductRecipe,
} from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const EMPTY_INGREDIENT = {
  name: "",
  unit: "unidad",
  stock: "",
  minimumStock: "",
  isActive: true,
};

const getIngredientSeverity = (ingredient) => {
  const stock = Number(ingredient?.stock || 0);
  const minimumStock = Number(ingredient?.minimumStock || 0);
  const isActive = ingredient?.isActive !== false;

  if (!isActive) {
    return {
      id: "inactive",
      label: "Inactivo",
      badge: "border-slate-600 bg-slate-800/70 text-slate-300",
      card: "border-slate-700 bg-slate-900/70",
    };
  }

  if (stock <= 0) {
    return {
      id: "critical",
      label: "Agotado",
      badge: "border-red-500/30 bg-red-500/12 text-red-200",
      card: "border-red-500/20 bg-red-500/8",
    };
  }

  if (stock <= minimumStock) {
    return {
      id: "low",
      label: "Bajo minimo",
      badge: "border-amber-500/30 bg-amber-500/12 text-amber-200",
      card: "border-amber-500/20 bg-amber-500/8",
    };
  }

  return {
    id: "healthy",
    label: "Estable",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    card: "border-slate-800 bg-slate-900/60",
  };
};

const compareIngredientsBySeverity = (a, b) => {
  const priority = {
    critical: 0,
    low: 1,
    inactive: 2,
    healthy: 3,
  };

  const severityDiff =
    (priority[getIngredientSeverity(a).id] ?? 99) -
    (priority[getIngredientSeverity(b).id] ?? 99);

  if (severityDiff !== 0) return severityDiff;

  return String(a?.name || "").localeCompare(String(b?.name || ""));
};

const computeRecipeDiagnostics = (products, ingredients) => {
  const ingredientsById = new Map(
    (ingredients || []).map((ingredient) => [String(ingredient.id || ingredient._id || ""), ingredient]),
  );

  return (products || []).map((product) => {
    const recipe = Array.isArray(product.recipe) ? product.recipe : [];
    const shortages = recipe
      .map((item) => {
        const ingredient = ingredientsById.get(String(item.ingredientId || ""));
        const stock = Number(ingredient?.stock || 0);
        const required = Number(item.quantityRequired || 0);

        if (!ingredient || stock < required) {
          return {
            ingredientName: item.ingredientName || ingredient?.name || "Ingrediente",
            stock,
            required,
            unit: item.unit || ingredient?.unit || "unidad",
          };
        }

        return null;
      })
      .filter(Boolean);

    return {
      ...product,
      recipe,
      shortages,
      blockedByIngredients: shortages.length > 0,
    };
  });
};

const IngredientForm = ({ value, onChange, onSubmit, saving, submitLabel }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <input
      value={value.name}
      onChange={(event) => onChange({ ...value, name: event.target.value })}
      placeholder="Nombre del ingrediente"
      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
    />
    <input
      value={value.unit}
      onChange={(event) => onChange({ ...value, unit: event.target.value })}
      placeholder="Unidad"
      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
    />
    <input
      value={value.stock}
      onChange={(event) => onChange({ ...value, stock: event.target.value })}
      placeholder="Stock"
      type="number"
      min="0"
      step="0.01"
      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
    />
    <input
      value={value.minimumStock}
      onChange={(event) => onChange({ ...value, minimumStock: event.target.value })}
      placeholder="Stock minimo"
      type="number"
      min="0"
      step="0.01"
      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
    />
    <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={value.isActive}
        onChange={(event) => onChange({ ...value, isActive: event.target.checked })}
      />
      Ingrediente activo
    </label>
    <button
      type="button"
      onClick={onSubmit}
      disabled={saving}
      className="md:col-span-2 rounded-xl bg-cyan-400 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
    >
      {saving ? "Guardando..." : submitLabel}
    </button>
  </div>
);

const RecipeEditor = ({ product, ingredients, onSaved }) => {
  const { showToast } = useToast();
  const recipe = Array.isArray(product?.recipe) ? product.recipe : [];
  const [items, setItems] = useState(
    recipe.map((item) => ({
      ingredientId: item.ingredientId || "",
      quantityRequired: item.quantityRequired || "",
    })),
  );
  const [saving, setSaving] = useState(false);

  const addRow = () => {
    setItems((current) => [...current, { ingredientId: "", quantityRequired: "" }]);
  };

  const updateRow = (index, nextRow) => {
    setItems((current) => current.map((item, currentIndex) => (currentIndex === index ? nextRow : item)));
  };

  const removeRow = (index) => {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSave = async () => {
    const normalized = items
      .filter((item) => item.ingredientId && Number(item.quantityRequired) > 0)
      .map((item) => ({
        ingredientId: item.ingredientId,
        quantityRequired: Number(item.quantityRequired),
      }));

    setSaving(true);
    try {
      await updateProductRecipe(product.id || product._id, normalized);
      showToast("Receta actualizada", "success");
      onSaved?.();
    } catch (error) {
      showToast(error?.message || "No se pudo actualizar la receta", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Receta</p>
          <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-white">{product.name}</p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500">
            Este producto aun no tiene receta ligada a ingredientes.
          </div>
        ) : null}

        {items.map((item, index) => (
          <div key={`${product.id || product._id}-recipe-${index}`} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <select
              value={item.ingredientId}
              onChange={(event) => updateRow(index, { ...item, ingredientId: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Selecciona ingrediente</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id || ingredient._id} value={ingredient.id || ingredient._id}>
                  {ingredient.name} ({ingredient.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.quantityRequired}
              onChange={(event) => updateRow(index, { ...item, quantityRequired: event.target.value })}
              placeholder="Cantidad"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-xl bg-emerald-400 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar receta"}
      </button>
    </div>
  );
};

const IngredientsManager = ({ ingredients, products, refresh }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_INGREDIENT);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustmentValues, setAdjustmentValues] = useState({});
  const [adjustingId, setAdjustingId] = useState("");

  const diagnostics = useMemo(
    () => computeRecipeDiagnostics(products, ingredients),
    [products, ingredients],
  );

  const blockedProducts = useMemo(
    () => diagnostics.filter((product) => product.blockedByIngredients),
    [diagnostics],
  );

  const sortedIngredients = useMemo(
    () => [...(Array.isArray(ingredients) ? ingredients : [])].sort(compareIngredientsBySeverity),
    [ingredients],
  );

  const inventorySummary = useMemo(() => {
    return sortedIngredients.reduce(
      (acc, ingredient) => {
        const severity = getIngredientSeverity(ingredient).id;
        if (severity === "critical") acc.critical += 1;
        else if (severity === "low") acc.low += 1;
        else if (severity === "inactive") acc.inactive += 1;
        else acc.healthy += 1;
        return acc;
      },
      { critical: 0, low: 0, inactive: 0, healthy: 0 },
    );
  }, [sortedIngredients]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast("El nombre del ingrediente es obligatorio", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim() || "unidad",
      stock: Number(form.stock || 0),
      minimumStock: Number(form.minimumStock || 0),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateIngredient(editingId, payload);
        showToast("Ingrediente actualizado", "success");
      } else {
        await createIngredient(payload);
        showToast("Ingrediente creado", "success");
      }

      setForm(EMPTY_INGREDIENT);
      setEditingId("");
      refresh?.();
    } catch (error) {
      showToast(error?.message || "No se pudo guardar el ingrediente", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ingredient) => {
    setEditingId(ingredient.id || ingredient._id || "");
    setForm({
      name: ingredient.name || "",
      unit: ingredient.unit || "unidad",
      stock: ingredient.stock ?? "",
      minimumStock: ingredient.minimumStock ?? "",
      isActive: ingredient.isActive !== false,
    });
  };

  const removeIngredient = async (ingredient) => {
    try {
      await deleteIngredient(ingredient.id || ingredient._id);
      showToast("Ingrediente eliminado", "success");
      refresh?.();
    } catch (error) {
      showToast(error?.message || "No se pudo eliminar el ingrediente", "error");
    }
  };

  const updateAdjustmentValue = (ingredientId, value) => {
    setAdjustmentValues((current) => ({
      ...current,
      [ingredientId]: value,
    }));
  };

  const applyStockAdjustment = async (ingredient, mode) => {
    const ingredientId = ingredient.id || ingredient._id || "";
    if (!ingredientId) return;

    const rawValue = Number(adjustmentValues[ingredientId] || 0);
    const adjustment = Math.max(0, rawValue);

    if (mode !== "reset" && adjustment <= 0) {
      showToast("Ingresa una cantidad valida para ajustar stock", "error");
      return;
    }

    const currentStock = Number(ingredient.stock || 0);
    const nextStock = mode === "add"
      ? currentStock + adjustment
      : mode === "subtract"
        ? Math.max(0, currentStock - adjustment)
        : 0;

    setAdjustingId(ingredientId);
    try {
      await updateIngredient(ingredientId, {
        name: ingredient.name || "",
        unit: ingredient.unit || "unidad",
        stock: nextStock,
        minimumStock: Number(ingredient.minimumStock || 0),
        isActive: ingredient.isActive !== false,
      });
      setAdjustmentValues((current) => ({
        ...current,
        [ingredientId]: "",
      }));
      showToast(
        mode === "add"
          ? "Stock repuesto correctamente"
          : mode === "subtract"
            ? "Stock descontado correctamente"
            : "Stock reiniciado a cero",
        "success",
      );
      refresh?.();
    } catch (error) {
      showToast(error?.message || "No se pudo ajustar el stock", "error");
    } finally {
      setAdjustingId("");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Ingredientes</p>
            <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">Inventario base de cocina</h2>
          </div>
          <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
            {blockedProducts.length} productos se bloquearian por receta
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
            <IngredientForm
              value={form}
              onChange={setForm}
              onSubmit={handleSubmit}
              saving={saving}
              submitLabel={editingId ? "Actualizar ingrediente" : "Crear ingrediente"}
            />
          </div>

          <div className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-200/80">Agotados</p>
                <p className="mt-2 text-2xl font-black text-red-200">{inventorySummary.critical}</p>
              </div>
              <div className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/80">Bajo minimo</p>
                <p className="mt-2 text-2xl font-black text-amber-200">{inventorySummary.low}</p>
              </div>
              <div className="rounded-[1.2rem] border border-slate-700 bg-slate-800/80 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Inactivos</p>
                <p className="mt-2 text-2xl font-black text-slate-200">{inventorySummary.inactive}</p>
              </div>
              <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/80">Estables</p>
                <p className="mt-2 text-2xl font-black text-emerald-200">{inventorySummary.healthy}</p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedIngredients.map((ingredient) => {
                const stock = Number(ingredient.stock || 0);
                const minimumStock = Number(ingredient.minimumStock || 0);
                const severity = getIngredientSeverity(ingredient);

                return (
                  <div key={ingredient.id || ingredient._id} className={`mt-3 rounded-xl border p-4 ${severity.card}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.12em] text-white">{ingredient.name}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          {stock} {ingredient.unit} disponibles
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${severity.badge}`}>
                          {severity.label}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                          Minimo {minimumStock} {ingredient.unit}
                        </span>
                        <button type="button" onClick={() => startEdit(ingredient)} className="rounded-full border border-slate-700 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                          Editar
                        </button>
                        <button type="button" onClick={() => removeIngredient(ingredient)} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-red-300">
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-[180px_repeat(3,minmax(0,1fr))]">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustmentValues[ingredient.id || ingredient._id || ""] || ""}
                        onChange={(event) =>
                          updateAdjustmentValue(ingredient.id || ingredient._id || "", event.target.value)
                        }
                        placeholder={`Ajuste en ${ingredient.unit}`}
                        className="rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => applyStockAdjustment(ingredient, "add")}
                        disabled={adjustingId === (ingredient.id || ingredient._id || "")}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200 disabled:opacity-60"
                      >
                        {adjustingId === (ingredient.id || ingredient._id || "") ? "Aplicando..." : "Sumar stock"}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStockAdjustment(ingredient, "subtract")}
                        disabled={adjustingId === (ingredient.id || ingredient._id || "")}
                        className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 disabled:opacity-60"
                      >
                        Descontar stock
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStockAdjustment(ingredient, "reset")}
                        disabled={adjustingId === (ingredient.id || ingredient._id || "")}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-200 disabled:opacity-60"
                      >
                        Marcar agotado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <ChefHat className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Recetas</p>
            <h2 className="mt-1 text-lg font-black uppercase tracking-[0.16em] text-white">Ligar productos a ingredientes</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {products.map((product) => (
            <RecipeEditor
              key={product.id || product._id}
              product={product}
              ingredients={ingredients}
              onSaved={refresh}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-amber-300" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Diagnostico</p>
            <h2 className="mt-1 text-lg font-black uppercase tracking-[0.16em] text-white">Productos con riesgo por ingredientes</h2>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {blockedProducts.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-200">
              Ningun producto queda bloqueado por ingredientes con los datos actuales.
            </div>
          ) : (
            blockedProducts.map((product) => (
              <div key={`blocked-${product.id || product._id}`} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-white">{product.name}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/80">
                  {product.shortages.length} ingrediente{product.shortages.length === 1 ? "" : "s"} bloqueando venta
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.shortages.map((shortage, index) => (
                    <span key={`${product.id || product._id}-shortage-${index}`} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-red-200">
                      {shortage.ingredientName}: requiere {shortage.required} {shortage.unit}, hay {shortage.stock}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default IngredientsManager;
