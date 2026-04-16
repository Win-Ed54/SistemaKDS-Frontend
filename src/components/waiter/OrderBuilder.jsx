import React, { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Minus, Plus, ReceiptText, Trash2, X } from "lucide-react";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import useProductStore from "../../store/productStore";
import { createOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import { validateOrderLimits } from "../../constants/orderLimits";
import { getCurrentKdsSettings } from "../../store/kdsSettingsStore";

const MAX_NOTE_LENGTH = 160;

const QUICK_NOTES = {
  Hamburguesas: [
    "Sin cebolla",
    "Sin tomate",
    "Sin lechuga",
    "Sin pepinillo",
    "Extra queso",
    "Sin queso",
  ],
  Pollo: ["Sin salsa", "Extra crujiente", "Sin picante", "Con limon"],
  Acompanamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres: ["Sin hielo", "Para llevar"],
  Bebidas: ["Sin hielo", "Con limon", "Extra fria", "Sin azucar"],
  Ensaladas: ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
  Desayunos: ["Sin tocino", "Huevo tierno", "Sin mantequilla"],
};

const normalizeCustomerName = (value) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const sanitizeNote = (value) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOTE_LENGTH);

const OrderBuilder = ({ customerName, tableId, pax, onOrderSent }) => {
  const {
    items,
    noteTarget,
    addItem,
    addCustomItem,
    removeItem,
    decreaseItem,
    clearOrder,
    resetAfterOrder,
    updateItemNotes,
    setNoteTarget,
    clearNoteTarget,
  } = useOrderBuilder();
  const products = useProductStore((state) => state.products);
  const { showToast } = useToast();

  const [isSending, setIsSending] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isTakeout = Number(tableId) === 0;
  const hasSelectedLocation = tableId !== null && tableId !== undefined && tableId !== "";

  const noteProduct = useMemo(() => {
    if (!noteTarget?.productId) return null;
    if (noteTarget?.product) return noteTarget.product;

    return products.find(
      (product) =>
        (product.id || product._id || product.Id) === noteTarget.productId,
    );
  }, [noteTarget, products]);

  const quickNotes = useMemo(() => {
    const category = noteProduct?.category || noteProduct?.Category;
    return QUICK_NOTES[category] || [];
  }, [noteProduct]);

  useEffect(() => {
    setNoteDraft(sanitizeNote(noteTarget?.currentNotes || ""));
  }, [noteTarget]);

  const toggleQuickNote = (quickNote) => {
    setNoteDraft((prev) => {
      const parts = prev
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (parts.includes(quickNote)) {
        return parts.filter((item) => item !== quickNote).join(", ");
      }

      return sanitizeNote(parts.length ? `${prev}, ${quickNote}` : quickNote);
    });
  };

  const sendOrder = async () => {
    const normalizedCustomerName = normalizeCustomerName(customerName || "");
    const normalizedPax = Number.parseInt(pax, 10);

    if (normalizedCustomerName && !/^[A-ZÁÉÍÓÚÜÑ\s]+$/u.test(normalizedCustomerName)) {
      showToast("El nombre del cliente solo puede llevar letras", "error");
      return;
    }

    if (!hasSelectedLocation || items.length === 0) {
      showToast("Seleccione ubicacion y productos", "error");
      return;
    }

    if (!isTakeout && (!Number.isInteger(normalizedPax) || normalizedPax < 1)) {
      showToast("Ingrese un numero valido de comensales", "error");
      return;
    }

    const limitValidation = validateOrderLimits(items, getCurrentKdsSettings());
    if (!limitValidation.ok) {
      showToast(limitValidation.message, "error");
      return;
    }

    if (isSending) return;

    const order = {
      tableNumber: Number.parseInt(tableId, 10),
      waiterName: localStorage.getItem("user_name") || "Mesero",
      customerName: normalizedCustomerName || "GENERAL",
      pax: isTakeout ? 0 : normalizedPax,
      items,
      status: 0,
    };

    try {
      setIsSending(true);
      await createOrder(order);
      window.dispatchEvent(new Event("kds-sync-products"));
      window.dispatchEvent(new Event("kds-sync-tables"));
      resetAfterOrder();
      onOrderSent?.();
      showToast("Orden enviada a cocina", "success");
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Error de conexion";
      window.dispatchEvent(new Event("kds-sync-products"));
      window.dispatchEvent(new Event("kds-sync-tables"));
      showToast(errorMsg, "error");
    } finally {
      setIsSending(false);
    }
  };

  const isButtonDisabled =
    items.length === 0 ||
    isSending ||
    !hasSelectedLocation ||
    (!isTakeout && !Number.isInteger(Number.parseInt(pax, 10)));

  const handleSaveNotes = () => {
    if (!noteTarget?.productId) return;

    const cleaned = sanitizeNote(noteDraft);

    if (noteTarget.source === "catalog" && noteTarget.product) {
      if (cleaned) {
        const result = addCustomItem(noteTarget.product, cleaned);
        if (result?.ok === false && result?.message) {
          showToast(result.message, "error");
          return;
        }
      } else {
        const result = addItem(noteTarget.product);
        if (result?.ok === false && result?.message) {
          showToast(result.message, "error");
          return;
        }
        clearNoteTarget();
      }
      return;
    }

    updateItemNotes(noteTarget.productId, cleaned, noteTarget.currentNotes || "");
  };

  return (
    <div className="flex min-h-0 flex-col rounded-[2.5rem] border border-slate-800 bg-slate-900 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Carrito actual
        </h2>
        {items.length > 0 && (
          <button
            onClick={clearOrder}
            className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500/70 transition-all hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" /> Borrar todo
          </button>
        )}
      </div>

      <div className="mb-6 min-h-[200px] max-h-[55vh] flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-20">
            <ReceiptText className="mb-2 h-12 w-12" />
            <p className="text-[10px] font-black uppercase tracking-widest">
              Sin productos
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const isEditing =
              noteTarget?.productId === item.productId &&
              (noteTarget?.currentNotes || "") === (item.notes || "") &&
              noteTarget?.source !== "catalog";

            return (
              <div
                key={`${item.productId}_${item.notes}_${index}`}
                className="rounded-2xl border border-slate-800/50 bg-slate-950 p-3 transition-all hover:border-slate-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
                      <button
                        onClick={() => decreaseItem(item.productId, item.notes)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-all hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[24px] text-center text-xs font-black text-cyan-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          const result = item.notes
                            ? addCustomItem(
                                {
                                  id: item.productId,
                                  name: item.productName,
                                  price: item.price,
                                },
                                item.notes,
                              )
                            : addItem({
                                id: item.productId,
                                name: item.productName,
                                price: item.price,
                              });

                          if (result?.ok === false && result?.message) {
                            showToast(result.message, "error");
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-all hover:text-cyan-300"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">
                        {item.productName}
                      </span>
                      {item.notes && (
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-300">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-emerald-400">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId, item.notes)}
                      className="text-slate-700 transition-colors hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setNoteTarget({
                        productId: item.productId,
                        currentNotes: item.notes || "",
                        source: "cart",
                      })
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                      item.notes
                        ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                        : "border-slate-800 text-slate-400 hover:border-cyan-400/30 hover:text-cyan-300"
                    }`}
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    {item.notes ? "Editar instrucciones" : "Agregar instrucciones"}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 rounded-[1.4rem] border border-cyan-400/20 bg-slate-900/80 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Instrucciones del producto
                        </p>
                        <p className="mt-1 text-xs font-black uppercase text-white">
                          {item.productName}
                        </p>
                      </div>
                      <button
                        onClick={clearNoteTarget}
                        className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition-all hover:text-white"
                      >
                        Cerrar
                      </button>
                    </div>

                    {quickNotes.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {quickNotes.map((quickNote) => {
                          const selected = noteDraft
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean)
                            .includes(quickNote);

                          return (
                            <button
                              key={quickNote}
                              onClick={() => toggleQuickNote(quickNote)}
                              className={`rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${
                                selected
                                  ? "bg-cyan-400 text-slate-950"
                                  : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-cyan-400/30"
                              }`}
                            >
                              {quickNote}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(sanitizeNote(event.target.value))}
                      maxLength={MAX_NOTE_LENGTH}
                      placeholder="Escribe instrucciones especiales para cocina o barra..."
                      className="min-h-[110px] w-full resize-none rounded-[1.2rem] border-2 border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white outline-none transition-all focus:border-cyan-500"
                    />

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {noteDraft.length}/{MAX_NOTE_LENGTH}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNoteDraft("")}
                          className="rounded-xl border border-slate-800 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition-all hover:text-red-300"
                        >
                          Limpiar
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          className="rounded-xl bg-emerald-400 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 transition-all hover:bg-emerald-300"
                        >
                          Guardar instrucciones
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {noteTarget?.source === "catalog" && noteProduct && (
          <div className="rounded-[1.6rem] border border-cyan-400/20 bg-slate-950/95 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Instrucciones para agregar
                </p>
                <p className="mt-1 text-sm font-black uppercase text-white">
                  {noteProduct.name || noteProduct.Name}
                </p>
              </div>
              <button
                onClick={clearNoteTarget}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition-all hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {quickNotes.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {quickNotes.map((quickNote) => {
                  const selected = noteDraft
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .includes(quickNote);

                  return (
                    <button
                      key={quickNote}
                      onClick={() => toggleQuickNote(quickNote)}
                      className={`rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${
                        selected
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-400/30"
                      }`}
                    >
                      {quickNote}
                    </button>
                  );
                })}
              </div>
            )}

            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(sanitizeNote(event.target.value))}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Opcional: agrega instrucciones para este producto..."
              className="min-h-[110px] w-full resize-none rounded-[1.2rem] border-2 border-slate-800 bg-slate-900 p-3 text-sm font-bold text-white outline-none transition-all focus:border-cyan-500"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                {noteDraft.length}/{MAX_NOTE_LENGTH}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const result = addItem(noteProduct);
                    if (result?.ok === false && result?.message) {
                      showToast(result.message, "error");
                      return;
                    }
                    clearNoteTarget();
                  }}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300 transition-all hover:border-slate-700"
                >
                  Agregar sin instrucciones
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 transition-all hover:bg-emerald-300"
                >
                  Agregar con instrucciones
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={sendOrder}
        disabled={isButtonDisabled}
        className={`flex w-full items-center justify-between rounded-[1.8rem] px-8 py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all ${
          isButtonDisabled
            ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-600 opacity-50"
            : "bg-emerald-400 text-black shadow-emerald-400/20 active:scale-95 hover:scale-[1.01]"
        }`}
      >
        <div className="flex flex-col items-start">
          <span className="text-[10px] leading-none opacity-70">
            {isSending ? "Enviando..." : "Confirmar orden"}
          </span>
          {!isSending && isTakeout && !normalizeCustomerName(customerName || "") && (
            <span className="mt-1 text-[7px] text-slate-700">
              Nombre opcional para llevar
            </span>
          )}
        </div>
        <span className="text-xl">{isSending ? "---" : `$${total.toFixed(2)}`}</span>
      </button>
    </div>
  );
};

export default OrderBuilder;
