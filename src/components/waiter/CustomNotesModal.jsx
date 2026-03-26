import React, { useState } from "react";
import { X, MessageSquare, Check, AlertCircle } from "lucide-react";

const CustomNotesModal = ({ product, onClose, onConfirm }) => {
  const [note, setNote] = useState("");
  
  // Opciones rápidas para tocar con el dedo sin escribir
  const quickNotes = ["Sin Cebolla", "Sin Tomate", "Extra Queso", "Término Medio", "Para Llevar", "Sin Sal"];

  const handleQuickNote = (q) => {
    setNote(prev => prev ? `${prev}, ${q}` : q);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* HEADER: Info del Producto */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFF00]/10 border border-[#FFFF00]/20 flex items-center justify-center">
              <MessageSquare className="text-[#FFFF00] w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{product.name}</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Instrucciones de Cocina</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CUERPO: Scrollable interno */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* OPCIONES RÁPIDAS (Grid táctil) */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-1">Selección Rápida</p>
            <div className="grid grid-cols-2 gap-2">
              {quickNotes.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickNote(q)}
                  className="py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-700 text-[10px] font-black text-slate-400 uppercase hover:border-[#FFFF00] hover:text-[#FFFF00] transition-all active:scale-95 text-left flex justify-between items-center"
                >
                  {q}
                  <Check size={12} className="opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>

          {/* ÁREA DE TEXTO */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Nota Personalizada</p>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Alergia al gluten, salsa aparte..."
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-xs font-bold text-white focus:border-[#FFFF00] outline-none transition-all placeholder:text-slate-800 resize-none h-28"
            />
          </div>
        </div>

        {/* FOOTER: Botón FIJO (Siempre visible) */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800">
          <button
            onClick={() => onConfirm(note)}
            className="w-full py-5 bg-[#FFFF00] text-black font-black uppercase text-xs rounded-2xl shadow-[0_10px_30px_rgba(255,255,0,0.15)] hover:scale-[1.02] active:scale-95 transition-all tracking-[0.2em]"
          >
            Confirmar e Incluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomNotesModal;
