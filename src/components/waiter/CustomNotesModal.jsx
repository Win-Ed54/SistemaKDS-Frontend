import React, { useState } from "react";
import { MessageSquare, X, Check } from "lucide-react"; // Importar iconos faltantes

const QUICK_NOTES = {
  Hamburguesas: ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepinillo", "Extra queso", "Sin queso", "Término medio", "Bien cocido"],
  Pollo: ["Sin salsa", "Extra crujiente", "Sin picante", "Con limón"],
  Acompañamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres: ["Sin hielo", "Para llevar"],
  Bebidas: ["Sin hielo", "Con limón", "Extra fría", "Sin azúcar"],
  Ensaladas: ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
  Desayunos: ["Sin tocino", "Huevo tierno", "Sin mantequilla", "Pan tostado", "Café con leche", "Sin azúcar"]
};

const CustomNotesModal = ({ product, onClose, onConfirm }) => {
  const [note, setNote] = useState("");

  // Obtener notas según categoría o usar una lista vacía por defecto
  const quickNotes = QUICK_NOTES[product?.category] || [];

  const handleQuickNote = (q) => {
    setNote(prev => {
      const currentNotes = prev ? prev.split(", ").map(n => n.trim()) : [];
      if (currentNotes.includes(q)) return prev;
      return prev ? `${prev}, ${q}` : q;
    });
  };

  const handleConfirm = () => {
    onConfirm(note.trim().replace(/^,|,$/g, ''));
  };

  return (
    // "items-start justify-start" manda el modal arriba a la izquierda
    <div className="fixed inset-0 z-[150] flex items-start justify-start p-4 bg-black/80 backdrop-blur-sm">
      
      {/* Contenedor principal */}
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md h-fit max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 rounded-3xl overflow-hidden">
        
        {/* 1. HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <MessageSquare className="text-cyan-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">
                {product?.name || "Instrucciones"}
              </h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Cocina / Barra</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* 2. CUERPO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Selección rápida */}
          {quickNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-1">Selección Rápida</p>
              <div className="grid grid-cols-2 gap-2">
                {quickNotes.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickNote(q)}
                    className="py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400 uppercase hover:border-cyan-500 hover:text-cyan-400 transition-all active:scale-95 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Área de texto */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Nota Especial</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Escribe aquí instrucciones adicionales..."
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all resize-none min-h-[100px]"
            />
          </div>
        </div>

        {/* 3. FOOTER */}
        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-[#39FF14] text-black font-black uppercase text-xs rounded-full shadow-[0_10px_30px_rgba(57,255,20,0.2)] hover:shadow-[0_10px_40px_rgba(57,255,20,0.4)] active:scale-95 transition-all tracking-[0.1em] flex items-center justify-center gap-3"
          >
            Confirmar Notas
            <Check size={18} strokeWidth={4} />
          </button>
          
          <button 
            onClick={() => setNote("")}
            className="w-full mt-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
          >
            Limpiar notas
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomNotesModal;
