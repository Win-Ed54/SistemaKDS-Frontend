import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const ProductCard = ({ product, onAdd, onOpenNotes }) => {
  const { items } = useOrderBuilder();
  
  // Buscar si este producto ya está en el carrito para mostrar el badge
  const cartItem = items.find((i) => i.productId === (product.id || product._id));
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isInCart = quantityInCart > 0;

  return (
    <div className={`group rounded-[2rem] border-2 overflow-hidden transition-all duration-300 flex flex-col h-full relative ${
      isOutOfStock ? "bg-slate-950/40 border-slate-900 opacity-60 grayscale"
      : isInCart ? "bg-slate-900 border-[#00FFFF] shadow-[0_0_25px_rgba(0,255,255,0.2)] scale-[1.02] z-10" 
      : isLowStock ? "bg-slate-900 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]"
      : "bg-slate-900 border-slate-800 hover:border-[#00FFFF]/40 shadow-2xl"
    }`}>
      
  
      {isInCart && (
        <div className="absolute -top-2 -left-2 z-30 animate-bounce-short">
          <div className="bg-[#00FFFF] text-black font-black text-sm w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_0_20px_#00FFFF] border-4 border-slate-950">
            {quantityInCart}x
          </div>
        </div>
      )}

      {/* Imagen y Stock */}
      <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
        )}
        <div className="absolute top-4 right-4 z-20">
          <span className={`text-[10px] px-3 py-1.5 rounded-2xl font-black backdrop-blur-md border ${
            isOutOfStock ? "bg-red-500/20 border-red-500/50 text-red-500"
            : isLowStock ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500"
            : "bg-slate-900/80 border-[#39FF14]/30 text-[#39FF14]"
          }`}>
            {isOutOfStock ? "SIN STOCK" : `STOCK: ${product.stock}`}
          </span>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="mb-4">
          <h3 className="font-black text-lg md:text-xl text-white mb-1 uppercase tracking-tight leading-tight">{product.name}</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic">{product.description}</p>
        </div>

        {/* PRECIO Y ACCIONES */}
        <div className="mt-auto pt-4 border-t border-slate-800/50">
          <div className="mb-4 flex justify-between items-end">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
               {isInCart ? "Subtotal" : "Precio"}
             </span>
             <span className="text-[#39FF14] font-black text-2xl md:text-3xl tracking-tighter">
                ${(isInCart ? product.price * quantityInCart : product.price).toFixed(2)}
             </span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => !isOutOfStock && onAdd(product)}
              disabled={isOutOfStock}
              className={`w-full py-4 rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                isOutOfStock ? "bg-slate-800 text-slate-600 border border-slate-700" 
                : isInCart ? "bg-[#00FFFF] text-black shadow-[0_0_20px_#00FFFF60]"
                : "bg-[#39FF14] text-black hover:shadow-[0_0_25px_rgba(57,255,20,0.4)] active:scale-95"
              }`}
            >
              {isOutOfStock ? "AGOTADO" : isInCart ? "Añadir otro" : "Agregar"}
            </button>

            <button
              onClick={() => !isOutOfStock && onOpenNotes(product)}
              disabled={isOutOfStock}
              className={`w-full py-3.5 rounded-[1.2rem] border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                cartItem?.notes 
                ? "bg-[#FFFF00]/10 border-[#FFFF00] text-[#FFFF00] shadow-[0_0_15px_#FFFF0030]" 
                : "border-slate-800 text-slate-500 hover:text-[#FFFF00] hover:border-[#FFFF00]/30"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {cartItem?.notes ? "Editar Notas" : "Instrucciones"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
