import React, { useMemo, useState } from "react";
import { Check, MessageSquare, RotateCcw, X } from "lucide-react";

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
    .slice(0, MAX_NOTE_LENGTH);

const CustomNotesModal = ({ product, currentNote = "", onClose, onConfirm }) => {
  const [note, setNote] = useState(() => sanitizeNote(currentNote || ""));

  const quickNotes = useMemo(() => QUICK_NOTES[product?.category] || [], [product]);

  const selectedQuickNotes = useMemo(
    () => note.split(", ").map((item) => item.trim()).filter(Boolean),
    [note]
  );

  const handleQuickNote = (quickNote) => {
    setNote((prev) => {
      const currentNotes = prev ? prev.split(", ").map((item) => item.trim()).filter(Boolean) : [];

      if (currentNotes.includes(quickNote)) {
        return currentNotes.filter((item) => item !== quickNote).join(", ");
      }

      return sanitizeNote(prev ? `${prev}, ${quickNote}` : quickNote);
    });
  };

  const handleConfirm = () => {
    onConfirm(
      sanitizeNote(note)
        .replace(/\r?\n/g, " ")
        .trim()
        .replace(/^,|,$/g, "")
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md p-3 sm:p-5">
      <div className="h-full max-w-3xl mx-auto rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-[0.16em] truncate">
                {product?.name || "Instrucciones"}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.24em] mt-1">
                Orden actual / cocina y barra
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-[0.18em] hover:border-cyan-500/30 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <section className="rounded-[1.8rem] border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Vista previa
                </p>
                <p className="text-lg font-black text-white uppercase mt-2">
                  {product?.name || "Producto"}
                </p>
              </div>
              <div className="px-3 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.18em]">
                {selectedQuickNotes.length} instrucciones activas
              </div>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Instruccion actual
              </p>
              <p className="text-sm font-bold text-slate-200 mt-2 min-h-6">
                {note || "Sin instrucciones especiales por ahora"}
              </p>
            </div>
          </section>

          {quickNotes.length > 0 && (
            <section className="rounded-[1.8rem] border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Seleccion rapida
                  </p>
                  <p className="text-sm font-black text-white uppercase mt-2">
                    Toques rapidos para tablet
                  </p>
                </div>
                <button
                  onClick={() => setNote("")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.16em] hover:text-red-300 hover:border-red-500/20 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {quickNotes.map((quickNote) => {
                  const isSelected = selectedQuickNotes.includes(quickNote);

                  return (
                    <button
                      key={quickNote}
                      onClick={() => handleQuickNote(quickNote)}
                      className={`rounded-[1.3rem] border px-4 py-4 text-left transition-all ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_10px_30px_rgba(34,211,238,0.18)]"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300"
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-[0.14em]">
                        {quickNote}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-[1.8rem] border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Instruccion manual
                </p>
                <p className="text-sm font-black text-white uppercase mt-2">
                  Ajuste final para la orden actual
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {note.length}/{MAX_NOTE_LENGTH}
              </span>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(sanitizeNote(e.target.value))}
              placeholder="Escribe aqui instrucciones especiales para cocina o barra..."
              maxLength={MAX_NOTE_LENGTH}
              className="w-full min-h-[180px] bg-slate-950 border-2 border-slate-800 rounded-[1.5rem] p-4 text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all resize-none"
            />
          </section>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/90 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-[1.4rem] bg-slate-900 border border-slate-800 text-slate-300 font-black uppercase text-[10px] tracking-[0.18em] hover:border-slate-700 transition-all"
            >
              Volver a la orden
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 rounded-[1.4rem] bg-[#39FF14] text-slate-950 font-black uppercase text-[11px] tracking-[0.18em] hover:bg-[#5dff3d] transition-all flex items-center justify-center gap-3"
            >
              <Check className="w-4 h-4" />
              Guardar instrucciones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomNotesModal;
