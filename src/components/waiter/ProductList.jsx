import React, { useState } from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const QUICK_NOTES = {
  Hamburguesas:    ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepinillo", "Extra queso", "Sin queso", "Término medio", "Bien cocido"],
  Pollo:           ["Sin salsa", "Extra crujiente", "Sin picante", "Con limón"],
  Acompañamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres:         ["Sin hielo", "Para llevar"],
  Bebidas:         ["Sin hielo", "Con limón", "Extra fría", "Sin azúcar"],
  Ensaladas:       ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
};
const DEFAULT_NOTES = ["Sin cebolla", "Sin tomate", "Extra queso", "Sin salsa", "Para llevar"];

// Modal de notas — se abre solo cuando el usuario toca el ícono de lápiz
const NotesModal = ({ product, currentNote, onConfirm, onClose }) => {
  const quickNotes = QUICK_NOTES[product.category] || DEFAULT_NOTES;
  // Pre-seleccionar notas que ya estaban escritas
  const [selectedNotes, setSelectedNotes] = useState(
    currentNote ? currentNote.split(", ").filter(Boolean) : []
  );
  const [customNote, setCustomNote] = useState("");

  const toggleNote = (note) =>
    setSelectedNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );

  const handleConfirm = () => {
    const all = [...selectedNotes, ...(customNote.trim() ? [customNote.trim()] : [])].join(", ");
    onConfirm(all);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Nota para cocina</p>
            <h3 className="font-black text-white uppercase text-sm">{product.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {quickNotes.map((note) => (
            <button key={note} onClick={() => toggleNote(note)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                selectedNotes.includes(note)
                  ? "bg-[#FFFF00]/20 border-[#FFFF00] text-[#FFFF00]"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
              }`}>
              {note}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Otra nota personalizada..."
          value={customNote} onChange={(e) => setCustomNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="w-full bg-slate-950 border border-slate-700 focus:border-[#FFFF00] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder:text-slate-700 mb-5" />

        <div className="flex gap-3">
          <button onClick={() => { onConfirm(""); onClose(); }}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-[11px] font-black uppercase transition-all">
            Sin nota
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/30 text-[11px] font-black uppercase transition-all">
            Guardar {selectedNotes.length > 0 ? `(${selectedNotes.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

// Tarjeta de producto
const ProductCard = ({ product, onAdd, onOpenNotes }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock   = product.stock > 0 && product.stock <= 10;
  const hasImage     = !!product.imageUrl;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all flex flex-col ${
      isOutOfStock
        ? "bg-slate-900/40 border-slate-800/50 opacity-50 grayscale"
        : isLowStock
        ? "bg-slate-900 border-yellow-500/20 hover:border-yellow-400/40"
        : "bg-slate-900 border-slate-700/50 hover:border-[#00FFFF]/30"
    }`}>

      {/* Imagen o placeholder */}
      <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden">
        {hasImage && (
          <img src={product.imageUrl} alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
        )}
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl">🍔</span>
            <p className="text-[10px] text-slate-600 font-black uppercase mt-1">{product.category}</p>
          </div>
        )}
        {/* Badge stock */}
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border backdrop-blur-sm ${
            isOutOfStock ? "bg-red-500/80 border-red-400 text-white"
            : isLowStock ? "bg-yellow-400/80 border-yellow-300 text-black"
            : "bg-slate-900/80 border-[#39FF14]/30 text-[#39FF14]"
          }`}>
            {isOutOfStock ? "AGOTADO" : product.stock}
          </span>
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-red-400 font-black text-xs uppercase tracking-widest border border-red-500/50 px-3 py-1 rounded-full bg-black/60">
              Sin existencias
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-black text-sm text-white leading-tight mb-0.5 line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-[10px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 gap-2">
          <span className="text-[#39FF14] font-black text-base">${Number(product.price).toFixed(2)}</span>

          <div className="flex items-center gap-1">
            {/* ✅ Ícono de nota — OPCIONAL, no bloquea el agregar */}
            <button
              onClick={() => !isOutOfStock && onOpenNotes(product)}
              disabled={isOutOfStock}
              title="Agregar nota para cocina"
              className="p-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-[#FFFF00] hover:border-[#FFFF00]/40 transition-all disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Botón agregar — NO abre modal, solo agrega */}
            <button
              onClick={() => !isOutOfStock && onAdd(product)}
              disabled={isOutOfStock}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                isOutOfStock
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                  : "bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/30 active:scale-95"
              }`}
            >
              {isOutOfStock ? "—" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const ProductList = ({ products }) => {
  const { addItem, updateItemNotes, items } = useOrderBuilder();
  // producto al que se le está editando la nota (desde la tarjeta del menú)
  const [noteProduct, setNoteProduct] = useState(null);

  const handleAdd = (product) => {
    addItem(product);
    // NO abre modal — el mesero agrega y listo
  };

  const handleOpenNotes = (product) => {
    setNoteProduct(product);
  };

  const handleConfirmNotes = (notes) => {
    if (noteProduct) {
      const id = noteProduct.id || noteProduct._id;
      // Si el producto ya está en el carrito, actualizar nota
      // Si no está, agregarlo con la nota
      const inCart = items?.find((i) => i.productId === id);
      if (!inCart) addItem(noteProduct);
      updateItemNotes(id, notes);
    }
    setNoteProduct(null);
  };

  return (
    <>
      {noteProduct && (
        <NotesModal
          product={noteProduct}
          currentNote={items?.find((i) => i.productId === (noteProduct.id || noteProduct._id))?.notes || ""}
          onConfirm={handleConfirmNotes}
          onClose={() => setNoteProduct(null)}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {products?.map((product) => (
          <ProductCard
            key={product.id || product._id}
            product={product}
            onAdd={handleAdd}
            onOpenNotes={handleOpenNotes}
          />
        ))}
      </div>
    </>
  );
};

export default ProductList;
