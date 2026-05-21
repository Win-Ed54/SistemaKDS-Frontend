import React, { useEffect, useMemo, useState } from "react";
import { ImagePlus, Plus, Search, Upload, X } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  updateProductStock,
  uploadProductImage,
} from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../common/ConfirmDialog";
import { resolveAssetUrl } from "../../config/runtime";

const CATEGORIES = [
  "Entradas",
  "Sopas y cremas",
  "Ensaladas",
  "Hamburguesas",
  "Pollo",
  "Carnes",
  "Mariscos",
  "Pastas",
  "Pizzas",
  "Tacos y wraps",
  "Acompanamientos",
  "Desayunos",
  "Menu infantil",
  "Postres",
  "Bebidas",
  "Cafe y te",
  "Combos",
  "Especialidades de la casa",
];
const EMPTY_FORM = { name: "", description: "", price: "", stock: "", category: "", imageUrl: "" };
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const fileToImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });

const normalizeFileName = (name) =>
  String(name || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "producto";

const convertImageToWebp = async (file) => {
  if (file.type === "image/webp") return file;

  const image = await fileToImageElement(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Tu navegador no pudo preparar la conversion de la imagen.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, "image/webp", 0.9);
  const baseName = normalizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
};

const ProductModal = ({ product, onClose, onSaved }) => {
  const isEdit = !!product?.id;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: product.name ?? "",
          description: product.description ?? "",
          price: product.price ?? "",
          stock: product.stock ?? "",
          category: product.category ?? "",
          imageUrl: product.imageUrl ?? "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ? resolveAssetUrl(product.imageUrl) : "");

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const handleChange = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const clearSelectedImage = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(form.imageUrl ? resolveAssetUrl(form.imageUrl) : "");
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Solo se permiten imagenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("La imagen no puede superar 5 MB.");
      return;
    }

    setError(null);

    try {
      const preparedFile = await convertImageToWebp(file);
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedImage(preparedFile);
      setPreviewUrl(URL.createObjectURL(preparedFile));
    } catch (err) {
      setError(err.message || "No se pudo preparar la imagen.");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (!form.category) return setError("Selecciona una categoria.");
    if (Number.isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      return setError("Precio invalido.");
    }
    if (Number.isNaN(parseInt(form.stock, 10)) || parseInt(form.stock, 10) < 0) {
      return setError("Stock invalido.");
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      category: form.category,
    };

    try {
      if (selectedImage) {
        const uploadResult = await uploadProductImage(selectedImage);
        payload.imageUrl = uploadResult?.imageUrl || "";
      } else if (form.imageUrl && form.imageUrl.trim() !== "") {
        payload.imageUrl = form.imageUrl.trim();
      }

      if (isEdit) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-700 bg-slate-900 p-8 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-6 w-1.5 rounded-full ${isEdit ? "bg-yellow-400 shadow-[0_0_10px_#FACC15]" : "bg-[#39FF14] shadow-[0_0_10px_#39FF14]"}`} />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">
              {isEdit ? "Editar platillo" : "Nuevo platillo"}
            </h2>
          </div>
          <button onClick={onClose} className="text-xl text-slate-500 transition-all hover:text-white">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre *">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Daves Triple"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:border-cyan-500"
            />
          </Field>

          <Field label="Descripcion">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Ingredientes o descripcion del platillo"
              className="mt-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:border-cyan-500"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio ($) *">
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-[#39FF14] outline-none transition-all placeholder:text-slate-700 focus:border-cyan-500"
              />
            </Field>

            <Field label="Stock *">
              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-cyan-400 outline-none transition-all placeholder:text-slate-700 focus:border-cyan-500"
              />
            </Field>
          </div>

          <Field label="Categoria *">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-cyan-500"
            >
              <option value="">-- Seleccionar --</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Imagen del producto">
            <div className="mt-1 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-500/20">
                  <Upload className="h-4 w-4" />
                  Agregar imagen
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {(selectedImage || form.imageUrl) ? (
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-red-400/50 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                    Quitar
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-[11px] font-bold text-slate-500">
                Se permiten archivos JPG, PNG o WEBP. Si subes JPG o PNG, se convierte a WEBP antes de guardarse.
              </p>
            </div>
          </Field>

          {previewUrl ? (
            <div className="mt-2 h-24 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              <img
                src={previewUrl}
                alt="preview"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600">
              <ImagePlus className="h-5 w-5" />
            </div>
          )}

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-black uppercase text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-[11px] font-black uppercase text-slate-400 transition-all hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`flex-1 rounded-xl py-3 text-[11px] font-black uppercase transition-all disabled:opacity-40 ${
              isEdit
                ? "border border-yellow-400 bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
                : "border border-[#39FF14] bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/30"
            }`}
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear platillo"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InventoryManager = ({ products, refresh }) => {
  const { showToast } = useToast();
  const [editingStock, setEditingStock] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [stockLoading, setStockLoading] = useState({});
  const [modal, setModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [stockFilter, setStockFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const stock = Number(product.stock ?? 0);

      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "low" && !(stock > 0 && stock <= 10)) return false;
      if (stockFilter === "ok" && stock <= 10) return false;

      if (!normalizedSearch) return true;

      return [product.name, product.category, product.description]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .some((value) => value.includes(normalizedSearch));
    });
  }, [products, search, stockFilter]);

  const handleStockEdit = (product) => {
    setEditingStock(product.id);
    setInputValues((prev) => ({ ...prev, [product.id]: product.stock }));
  };

  const handleStockCancel = () => setEditingStock(null);

  const handleStockSave = async (product) => {
    const newStock = parseInt(inputValues[product.id], 10);
    if (Number.isNaN(newStock) || newStock < 0) {
      showToast("Ingresa un stock valido", "error");
      return;
    }

    setStockLoading((prev) => ({ ...prev, [product.id]: true }));
    try {
      await updateProductStock(product.id, newStock);
      setEditingStock(null);
      showToast(`Stock actualizado para ${product.name}`, "success");
      refresh();
    } catch (err) {
      showToast(err.message || "No se pudo actualizar el stock", "error");
    } finally {
      setStockLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "deactivate") {
      try {
        await updateProductStock(confirmAction.product.id, 0);
        showToast(`${confirmAction.product.name} marcado como agotado`, "success");
        setConfirmAction(null);
        refresh();
      } catch (err) {
        showToast(err.message || "No se pudo desactivar el producto", "error");
      }
      return;
    }

    if (confirmAction.type === "delete") {
      setDeletingId(confirmAction.product.id);
      try {
        await deleteProduct(confirmAction.product.id);
        showToast(`${confirmAction.product.name} eliminado`, "success");
        setConfirmAction(null);
        refresh();
      } catch (err) {
        showToast(err.message || "No se pudo eliminar el producto", "error");
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <>
      {modal !== null ? (
        <ProductModal
          product={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            showToast("Inventario actualizado", "success");
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Eliminar producto"
            : "Marcar producto como agotado"
        }
        description={
          confirmAction?.type === "delete"
            ? `Se eliminara ${confirmAction?.product?.name || "este producto"} de forma permanente.`
            : `Se ajustara el stock de ${confirmAction?.product?.name || "este producto"} a 0.`
        }
        confirmLabel={confirmAction?.type === "delete" ? "Eliminar" : "Marcar agotado"}
        cancelLabel="Volver"
        tone={confirmAction?.type === "delete" ? "danger" : "warning"}
        loading={Boolean(confirmAction?.type === "delete" && deletingId)}
        onConfirm={runConfirmAction}
        onCancel={() => (deletingId ? undefined : setConfirmAction(null))}
      />

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00FFFF]" />
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                Control de inventario
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                {filteredProducts.length} visibles / {products.length} productos
              </span>
              <button
                onClick={() => setModal("create")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/50 bg-[#39FF14]/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#39FF14] transition-all hover:bg-[#39FF14]/20"
              >
                <Plus className="h-3 w-3" />
                Nuevo platillo
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value.slice(0, 40))}
                placeholder="Buscar por nombre, categoria o descripcion"
                className="w-full rounded-[1.2rem] border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Todo" },
                { id: "ok", label: "OK" },
                { id: "low", label: "Stock bajo" },
                { id: "out", label: "Agotados" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setStockFilter(option.id)}
                  className={`rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                    stockFilter === option.id
                      ? "border-cyan-300 bg-cyan-400 text-slate-950"
                      : "border-slate-800 bg-slate-950 text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="pb-4">Producto</th>
                <th className="pb-4 text-center">Precio</th>
                <th className="pb-4 text-center">Stock</th>
                <th className="pb-4 text-center">Estado</th>
                <th className="pb-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock ?? 0);
                const isEditingStock = editingStock === product.id;
                const isDeleting = deletingId === product.id;

                return (
                  <tr
                    key={product.id}
                    className={`transition-all ${stock <= 0 ? "opacity-50" : "hover:bg-slate-800/30"}`}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={resolveAssetUrl(product.imageUrl)}
                            alt={product.name}
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                            <span className="text-lg">P</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold uppercase text-slate-200">{product.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            {product.category}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-center text-sm font-black text-[#39FF14]">
                      ${Number(product.price).toFixed(2)}
                    </td>

                    <td className="py-4 text-center">
                      {!isEditingStock ? (
                        <button
                          onClick={() => handleStockEdit(product)}
                          title="Click para ajustar"
                          className={`text-xl font-black transition-all hover:scale-110 ${
                            stock <= 0 ? "text-red-500" : stock <= 10 ? "text-yellow-400" : "text-white"
                          }`}
                        >
                          {stock}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={inputValues[product.id] ?? stock}
                            onChange={(event) =>
                              setInputValues((prev) => ({ ...prev, [product.id]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") handleStockSave(product);
                              if (event.key === "Escape") handleStockCancel();
                            }}
                            autoFocus
                            className="w-16 rounded-lg border border-cyan-500/50 bg-slate-950 px-2 py-1 text-center text-sm font-black text-cyan-400 focus:outline-none"
                          />
                          <button
                            onClick={() => handleStockSave(product)}
                            disabled={stockLoading[product.id]}
                            className="rounded-lg border border-cyan-500 bg-cyan-500/20 px-2 py-1 text-[10px] font-black text-cyan-400 disabled:opacity-40"
                          >
                            {stockLoading[product.id] ? "..." : "OK"}
                          </button>
                          <button
                            onClick={handleStockCancel}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400"
                          >
                            X
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-black ${
                          stock <= 0
                            ? "border-red-500 bg-red-500/10 text-red-500"
                            : stock <= 10
                              ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                              : "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {stock <= 0 ? "AGOTADO" : stock <= 10 ? "BAJO" : "OK"}
                      </span>
                    </td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal(product)}
                          title="Editar"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-all hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {stock > 0 ? (
                          <button
                            onClick={() => setConfirmAction({ type: "deactivate", product })}
                            title="Marcar agotado"
                            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-all hover:border-orange-400/50 hover:bg-orange-400/10 hover:text-orange-400"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : null}
                        <button
                          onClick={() => setConfirmAction({ type: "delete", product })}
                          disabled={isDeleting}
                          title="Eliminar"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

const Field = ({ label, children }) => (
  <div>
    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
      {label}
    </label>
    {children}
  </div>
);

export default InventoryManager;
