import React, { useState } from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const QUICK_NOTES = {
  Hamburguesas: ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepinillo", "Extra queso", "Sin queso", "Término medio", "Bien cocido"],
  Pollo: ["Sin salsa", "Extra crujiente", "Sin picante", "Con limón"],
  Acompañamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres: ["Sin hielo", "Para llevar"],
  Bebidas: ["Sin hielo", "Con limón", "Extra fría", "Sin azúcar"],
  Ensaladas: ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
};
const DEFAULT_NOTES = ["Sin cebolla", "Sin tomate", "Extra queso", "Sin salsa", "Para llevar"];

// ✅ MODAL TRANSFORMADO EN PANEL LATERAL (RIGHT DRAWER)
const NotesModal = ({ product, currentNote, onConfirm, onClose }) => {
  const quickNotes = QUICK_NOTES[product.category] || DEFAULT_NOTES;
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
    // Contenedor fijo que se alinea a la derecha (justify-end)
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      {/* El panel ocupa todo el alto y se desliza desde la derecha */}
      <div className="bg-slate-900 border-l border-slate-700 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header del Panel */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00FFFF]">Configuración</p>
            <h3 className="font-black text-white uppercase text-lg">{product.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Notas Rápidas</label>
            <div className="flex flex-wrap gap-2">
              {quickNotes.map((note) => (
                <button 
                  key={note} 
                  onClick={() => toggleNote(note)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                    selectedNotes.includes(note)
                      ? "bg-[#FFFF00] border-[#FFFF00] text-black shadow-[0_0_15px_rgba(255,255,0,0.3)]"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Instrucción Adicional</label>
            <textarea 
              placeholder="Escribe aquí alguna indicación extra..."
              value={customNote} 
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 focus:border-[#00FFFF] rounded-2xl px-4 py-4 text-white text-sm outline-none transition-all placeholder:text-slate-700 min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Footer del Panel */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex gap-3">
          <button 
            onClick={() => { onConfirm(""); onClose(); }}
            className="flex-1 py-4 rounded-2xl border-2 border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 text-[11px] font-black uppercase transition-all"
          >
            Quitar Notas
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 py-4 rounded-2xl bg-[#39FF14] text-black hover:bg-[#32e612] text-[11px] font-black uppercase transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)]"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

// Tarjeta de producto (Con botones abajo)
const ProductCard = ({ product, onAdd, onOpenNotes }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const hasImage = !!product.imageUrl;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all flex flex-col ${
      isOutOfStock ? "bg-slate-900/40 border-slate-800/50 opacity-50 grayscale"
      : isLowStock ? "bg-slate-900 border-yellow-500/20"
      : "bg-slate-900 border-slate-700/50 hover:border-[#00FFFF]/30"
    }`}>
      <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden">
        {hasImage && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />}
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-slate-900/80 border border-[#39FF14]/30 text-[#39FF14]">
            {isOutOfStock ? "AGOTADO" : product.stock}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-black text-sm text-white mb-0.5 line-clamp-1 uppercase">{product.name}</h3>
        <p className="text-[10px] text-slate-500 line-clamp-2 mb-2 h-[30px]">{product.description}</p>

        <div className="mt-auto space-y-3 pt-2">
          <span className="text-[#39FF14] font-black text-lg block">
            ${Number(product.price).toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isOutOfStock && onOpenNotes(product)}
              disabled={isOutOfStock}
              className="p-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-[#FFFF00] transition-all bg-slate-950/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => !isOutOfStock && onAdd(product)}
              disabled={isOutOfStock}
              className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-[#39FF14]/10 border border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14] hover:text-black"
            >
              {isOutOfStock ? "Sin Stock" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductList = ({ products }) => {
  const { addItem, updateItemNotes, items } = useOrderBuilder();
  const [noteProduct, setNoteProduct] = useState(null);

  const handleAdd = (product) => addItem(product);
  const handleOpenNotes = (product) => setNoteProduct(product);

  const handleConfirmNotes = (notes) => {
    if (noteProduct) {
      const id = noteProduct.id || noteProduct._id;
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
          <ProductCard key={product.id || product._id} product={product} onAdd={handleAdd} onOpenNotes={handleOpenNotes} />
        ))}
      </div>
    </>
  );
};

export default ProductList;
