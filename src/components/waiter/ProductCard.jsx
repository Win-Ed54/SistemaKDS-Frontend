import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const ProductCard = ({ product, onAdd, onOpenNotes, onEditExistingNote }) => {
  const { items } = useOrderBuilder();

  const productId = product.id || product._id || product.Id;
  const productStock = Number(product.stock ?? product.Stock ?? 0);
  const productPrice = Number(product.price ?? product.Price ?? 0);
  const productName = product.name || product.Name || "Producto";
  const productDescription = product.description || product.Description || "";
  const productImageUrl = product.imageUrl || product.ImageUrl || "";

  const productItems = items.filter((item) => item.productId === productId);
  const quantityInCart = productItems.reduce((sum, item) => sum + item.quantity, 0);
  const noteVariants = productItems.filter(
    (item) => String(item.notes || "").trim().length > 0
  );
  const hasAnyNotes = noteVariants.length > 0;

  const isOutOfStock = productStock <= 0;
  const isLowStock = productStock > 0 && productStock <= 5;
  const isInCart = quantityInCart > 0;
  const totalPrice = isInCart ? productPrice * quantityInCart : productPrice;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border transition-all duration-200 ${
        isOutOfStock
          ? "border-slate-900 bg-slate-950/40 opacity-60 grayscale"
          : isInCart
            ? "border-cyan-400/70 bg-slate-900 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
            : isLowStock
              ? "border-yellow-500/30 bg-slate-900 shadow-[0_0_12px_rgba(234,179,8,0.05)]"
              : "border-slate-800 bg-slate-900 hover:border-cyan-400/30"
      }`}
    >
      {isInCart && (
        <div className="absolute left-3 top-3 z-20 flex h-9 min-w-9 items-center justify-center rounded-xl border border-cyan-300/50 bg-cyan-400 px-2 text-xs font-black text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
          {quantityInCart}x
        </div>
      )}

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
        {productImageUrl ? (
          <img
            src={productImageUrl}
            alt={productName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-slate-800" />
        )}

        <div className="absolute right-3 top-3 z-20">
          <span
            className={`rounded-xl border px-2.5 py-1 text-[9px] font-black uppercase backdrop-blur-md ${
              isOutOfStock
                ? "border-red-500/40 bg-red-500/20 text-red-400"
                : isLowStock
                  ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-300"
                  : "border-emerald-400/30 bg-slate-900/80 text-emerald-400"
            }`}
          >
            {isOutOfStock ? "Sin stock" : `Stock ${productStock}`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3">
          <h3 className="mb-1 line-clamp-2 text-base font-black uppercase tracking-tight text-white sm:text-lg">
            {productName}
          </h3>
          <p className="line-clamp-2 text-[10px] italic leading-relaxed text-slate-500 sm:text-[11px]">
            {productDescription}
          </p>
        </div>

        <div className="mt-auto border-t border-slate-800/60 pt-3">
          <div className="mb-3 flex items-end justify-between gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              {isInCart ? "Subtotal" : "Precio"}
            </span>
            <span className="text-xl font-black tracking-tighter text-emerald-400 sm:text-2xl">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          {hasAnyNotes && (
            <div className="mb-3 rounded-[1rem] border border-yellow-400/20 bg-yellow-400/5 p-3">
              <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-yellow-300/80">
                Variantes con instrucciones
              </p>
              <div className="flex flex-wrap gap-2">
                {noteVariants.map((item, index) => (
                  <button
                    key={`${productId}_${item.notes}_${index}`}
                    onClick={() => onEditExistingNote?.(product, item.notes || "")}
                    className="max-w-full rounded-xl border border-yellow-400/30 bg-slate-950 px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] text-yellow-200 transition-all hover:border-yellow-300 hover:text-yellow-100"
                  >
                    <span className="mr-2 text-cyan-300">{item.quantity}x</span>
                    <span className="break-words">{item.notes}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => !isOutOfStock && onAdd(product)}
              disabled={isOutOfStock}
              className={`w-full rounded-[1rem] py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                isOutOfStock
                  ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-600"
                  : isInCart
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              }`}
            >
              {isOutOfStock ? "Agotado" : isInCart ? "Agregar otro" : "Agregar"}
            </button>

            <button
              onClick={() => !isOutOfStock && onOpenNotes(product)}
              disabled={isOutOfStock}
              className={`flex w-full items-center justify-center gap-2 rounded-[1rem] border py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                hasAnyNotes
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-800 text-slate-400 hover:border-yellow-400/30 hover:text-yellow-300"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {hasAnyNotes ? "Agregar instrucciones" : "Instrucciones"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
