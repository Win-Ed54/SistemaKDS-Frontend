import React, { useState } from "react";
import { MessageSquare, X, Check } from "lucide-react";

const MAX_NOTE_LENGTH = 160;

const QUICK_NOTES = {
  Hamburguesas: ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepinillo", "Extra queso", "Sin queso", "Termino medio", "Bien cocido"],
  Pollo: ["Sin salsa", "Extra crujiente", "Sin picante", "Con limon"],
  Acompanamientos: ["Sin sal", "Extra salsa", "Bien dorado"],
  Postres: ["Sin hielo", "Para llevar"],
  Bebidas: ["Sin hielo", "Con limon", "Extra fria", "Sin azucar"],
  Ensaladas: ["Sin aderezo", "Aderezo aparte", "Sin nueces"],
  Desayunos: ["Sin tocino", "Huevo tierno", "Sin mantequilla", "Pan tostado", "Cafe con leche", "Sin azucar"],
};

const sanitizeNote = (value) =>
  value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trimStart()
    .slice(0, MAX_NOTE_LENGTH);

const CustomNotesModal = ({ product, onClose, onConfirm }) => {
  const [note, setNote] = useState("");

  const quickNotes = QUICK_NOTES[product?.category] || [];

  const handleQuickNote = (quickNote) => {
    setNote((prev) => {
      const currentNotes = prev ? prev.split(", ").map((item) => item.trim()) : [];
      if (currentNotes.includes(quickNote)) return prev;
      return sanitizeNote(prev ? `${prev}, ${quickNote}` : quickNote);
    });
  };

  const handleConfirm = () => {
    onConfirm(sanitizeNote(note).replace(/^,|,$/g, ""));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-start p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md h-fit max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <MessageSquare className="text-cyan-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">
                {product?.name || "Instrucciones"}
              </h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                Cocina / Barra
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {quickNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-1">
                Seleccion Rapida
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickNotes.map((quickNote) => (
                  <button
                    key={quickNote}
                    onClick={() => handleQuickNote(quickNote)}
                    className="py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400 uppercase hover:border-cyan-500 hover:text-cyan-400 transition-all active:scale-95 text-left"
                  >
                    {quickNote}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">
              Nota Especial
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(sanitizeNote(e.target.value))}
              placeholder="Escribe aqui instrucciones adicionales..."
              maxLength={MAX_NOTE_LENGTH}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all resize-none min-h-[100px]"
            />
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">
              {note.length}/{MAX_NOTE_LENGTH}
            </p>
          </div>
        </div>

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
