import React, { useState } from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import ProductCard from "./ProductCard"; // ✅ Asegúrate de tener este archivo creado

// 1. LAS CONSTANTES SE QUEDAN AQUÍ
const QUICK_NOTES = {
  Hamburguesas: ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepinillo", "Extra queso", "Sin queso", "Término medio", "Bien cocido"],
  Pollo: ["Sin salsa", "Extra crujiente", "Sin picante", "Con limón"],
  Acompañamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres: ["Sin hielo", "Para llevar"],
  Bebidas: ["Sin hielo", "Con limón", "Extra fría", "Sin azúcar"],
  Ensaladas: ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
  Desayunos: ["Sin tocino", "Huevo tierno", "Sin mantequilla", "Pan tostado", "Café con leche", "Sin azúcar"]
};
const DEFAULT_NOTES = ["Sin cebolla", "Sin tomate", "Extra queso", "Para llevar"];

// 2. EL MODAL (DRAWER) SE QUEDA AQUÍ
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
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-md transition-all">
      <div className="bg-slate-900 border-l border-slate-700 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00FFFF]">Personalizar</p>
            <h3 className="font-black text-white uppercase text-xl">{product.name}</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Opciones Rápidas</label>
            <div className="flex flex-wrap gap-2">
              {quickNotes.map((note) => (
                <button 
                  key={note} 
                  onClick={() => toggleNote(note)}
                  className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border-2 ${
                    selectedNotes.includes(note)
                      ? "bg-[#FFFF00] border-[#FFFF00] text-black shadow-[0_0_20px_rgba(255,255,0,0.4)]"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Nota Especial</label>
            <textarea 
              placeholder="Ej: Alérgico al maní, extra servilletas..."
              value={customNote} 
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 focus:border-[#00FFFF] rounded-[2rem] px-6 py-6 text-white text-sm outline-none transition-all placeholder:text-slate-800 min-h-[150px] resize-none shadow-inner"
            />
          </section>
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-3">
          <button onClick={handleConfirm} className="w-full py-5 rounded-[1.5rem] bg-[#39FF14] text-black text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
            Guardar en Pedido
          </button>
          <button onClick={() => { onConfirm(""); onClose(); }} className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">
            Limpiar todas las notas
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. EL COMPONENTE PRINCIPAL QUE RENDERIZA LA LISTA
const ProductList = ({ products }) => {
  const { addItem, updateItemNotes, items } = useOrderBuilder();
  const [noteProduct, setNoteProduct] = useState(null);

  const handleConfirmNotes = (notes) => {
    if (noteProduct) {
      const id = noteProduct.id || noteProduct._id;
      // Si no está en el carrito, lo agregamos primero
      const inCart = items?.find((i) => i.productId === id);
      if (!inCart) addItem(noteProduct);
      
      updateItemNotes(id, notes);
    }
    setNoteProduct(null);
  };

  return (
    <>
      {/* RENDER DEL MODAL DE NOTAS */}
      {noteProduct && (
        <NotesModal
          product={noteProduct}
          currentNote={items?.find((i) => i.productId === (noteProduct.id || noteProduct._id))?.notes}
          onConfirm={handleConfirmNotes}
          onClose={() => setNoteProduct(null)}
        />
      )}

      {/* RENDER DE LA CUADRÍCULA (GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <ProductCard 
            key={product.id || product._id} 
            product={product} 
            onAdd={addItem} 
            onOpenNotes={setNoteProduct} 
          />
        ))}
      </div>
    </>
  );
};

export default ProductList;

