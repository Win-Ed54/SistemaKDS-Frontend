import React, { useState } from "react";
import {
  updateProductStock,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/api.service";

const CATEGORIES = ["Hamburguesas","Pollo","Acompañamientos","Postres","Bebidas","Ensaladas"];
const EMPTY_FORM  = { name:"", description:"", price:"", stock:"", category:"", imageUrl:"" };

// ---------------------------
// MODAL CREAR / EDITAR
// ---------------------------
const ProductModal = ({ product, onClose, onSaved }) => {
  const isEdit = !!product?.id;
  const [form, setForm] = useState(
    isEdit
      ? { name: product.name ?? "", description: product.description ?? "",
          price: product.price ?? "", stock: product.stock ?? "",
          category: product.category ?? "", imageUrl: product.imageUrl ?? "" }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim())  return setError("El nombre es obligatorio.");
    if (!form.category)     return setError("Selecciona una categoría.");
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0)
      return setError("Precio inválido.");
    if (isNaN(parseInt(form.stock)) || parseInt(form.stock) < 0)
      return setError("Stock inválido.");

    setSaving(true);
    setError(null);
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       parseFloat(form.price),
      stock:       parseInt(form.stock),
      category:    form.category,
      
    };
    if (form.imageUrl && form.imageUrl.trim() !== "") {
    payload.imageUrl = form.imageUrl.trim();
  }
    try {
      if (isEdit) await updateProduct(product.id, payload);
      else        await createProduct(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`w-1.5 h-6 rounded-full ${isEdit ? "bg-yellow-400 shadow-[0_0_10px_#FACC15]" : "bg-[#39FF14] shadow-[0_0_10px_#39FF14]"}`} />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">
              {isEdit ? "Editar Platillo" : "Nuevo Platillo"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Ej: Dave's Triple"
              className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all placeholder:text-slate-700" />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Ingredientes o descripción del platillo" rows={2}
              className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all placeholder:text-slate-700 resize-none" />
          </div>

          {/* Precio + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio ($) *</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange}
                placeholder="0.00"
                className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-[#39FF14] font-black text-sm outline-none transition-all placeholder:text-slate-700" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock *</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange}
                placeholder="0"
                className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-cyan-400 font-black text-sm outline-none transition-all placeholder:text-slate-700" />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría *</label>
            <select name="category" value={form.category} onChange={handleChange}
              className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all">
              <option value="">-- Seleccionar --</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* ✅ URL DE IMAGEN */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              URL de imagen
              <span className="ml-2 text-slate-600 normal-case font-normal">(opcional)</span>
            </label>
            <input name="imageUrl" value={form.imageUrl} onChange={handleChange}
              placeholder="https://i.imgur.com/ejemplo.jpg"
              className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-[#FF6B00] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-all placeholder:text-slate-700" />
            {/* Vista previa de la imagen */}
            {form.imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 h-24 bg-slate-800">
                <img src={form.imageUrl} alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => e.target.style.display = "none"} />
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-[11px] font-black uppercase bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-[11px] font-black uppercase transition-all">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase transition-all disabled:opacity-40 ${
              isEdit
                ? "bg-yellow-400/20 border border-yellow-400 text-yellow-400 hover:bg-yellow-400/30"
                : "bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/30"
            }`}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear platillo"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------
// COMPONENTE PRINCIPAL
// ---------------------------
const InventoryManager = ({ products, refresh }) => {
  const [editingStock, setEditingStock] = useState(null);
  const [inputValues, setInputValues]   = useState({});
  const [stockLoading, setStockLoading] = useState({});
  const [modal, setModal]               = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  const handleStockEdit   = (p) => { setEditingStock(p.id); setInputValues((prev) => ({ ...prev, [p.id]: p.stock })); };
  const handleStockCancel = ()  => setEditingStock(null);

  const handleStockSave = async (p) => {
    const newStock = parseInt(inputValues[p.id]);
    if (isNaN(newStock) || newStock < 0) { alert("Ingresa un número válido."); return; }
    setStockLoading((prev) => ({ ...prev, [p.id]: true }));
    try { await updateProductStock(p.id, newStock); setEditingStock(null); refresh(); }
    catch (err) { alert(`Error: ${err.message}`); }
    finally { setStockLoading((prev) => ({ ...prev, [p.id]: false })); }
  };

  const handleDeactivate = async (p) => {
    if (!confirm(`¿Desactivar "${p.name}"? El stock quedará en 0.`)) return;
    try { await updateProductStock(p.id, 0); refresh(); }
    catch (err) { alert(`Error: ${err.message}`); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar permanentemente "${p.name}"?`)) return;
    setDeletingId(p.id);
    try { await deleteProduct(p.id); refresh(); }
    catch (err) { alert(`Error: ${err.message}`); }
    finally { setDeletingId(null); }
  };

  return (
    <>
      {modal !== null && (
        <ProductModal product={modal === "create" ? null : modal} onClose={() => setModal(null)} onSaved={refresh} />
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_#00FFFF]" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Control de Inventario</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{products.length} productos</span>
            <button onClick={() => setModal("create")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14]/20 text-[10px] font-black uppercase tracking-wider transition-all">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo platillo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4">Producto</th>
                <th className="pb-4 text-center">Precio</th>
                <th className="pb-4 text-center">Stock</th>
                <th className="pb-4 text-center">Estado</th>
                <th className="pb-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.map((p) => {
                const isEditingStock = editingStock === p.id;
                const isDeleting     = deletingId === p.id;
                return (
                  <tr key={p.id} className={`transition-all ${p.stock <= 0 ? "opacity-50" : "hover:bg-slate-800/30"}`}>
                    {/* NOMBRE + imagen miniatura */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            <span className="text-lg">🍔</span>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-slate-200 uppercase">{p.name}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    {/* PRECIO */}
                    <td className="py-4 text-center font-black text-[#39FF14] text-sm">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    {/* STOCK INLINE */}
                    <td className="py-4 text-center">
                      {!isEditingStock ? (
                        <button onClick={() => handleStockEdit(p)} title="Click para ajustar"
                          className={`font-black text-xl transition-all hover:scale-110 ${p.stock <= 0 ? "text-red-500" : p.stock <= 10 ? "text-yellow-400" : "text-white"}`}>
                          {p.stock}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <input type="number" min="0" value={inputValues[p.id] ?? p.stock}
                            onChange={(e) => setInputValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleStockSave(p); if (e.key === "Escape") handleStockCancel(); }}
                            autoFocus className="w-16 bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-center text-cyan-400 font-black text-sm focus:outline-none" />
                          <button onClick={() => handleStockSave(p)} disabled={stockLoading[p.id]}
                            className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500 text-cyan-400 text-[10px] font-black disabled:opacity-40">
                            {stockLoading[p.id] ? "..." : "✓"}
                          </button>
                          <button onClick={handleStockCancel}
                            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black">✕</button>
                        </div>
                      )}
                    </td>
                    {/* ESTADO */}
                    <td className="py-4 text-center">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${
                        p.stock <= 0  ? "bg-red-500/10 border-red-500 text-red-500" :
                        p.stock <= 10 ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" :
                        "bg-emerald-500/10 border-emerald-500 text-emerald-500"}`}>
                        {p.stock <= 0 ? "AGOTADO" : p.stock <= 10 ? "BAJO" : "OK"}
                      </span>
                    </td>
                    {/* ACCIONES */}
                    <td className="py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal(p)} title="Editar"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-yellow-400/10 border border-slate-700 hover:border-yellow-400/50 text-slate-400 hover:text-yellow-400 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {p.stock > 0 && (
                          <button onClick={() => handleDeactivate(p)} title="Desactivar"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-400/10 border border-slate-700 hover:border-orange-400/50 text-slate-400 hover:text-orange-400 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => handleDelete(p)} disabled={isDeleting} title="Eliminar"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-all disabled:opacity-40">
                          {isDeleting
                            ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default InventoryManager;
