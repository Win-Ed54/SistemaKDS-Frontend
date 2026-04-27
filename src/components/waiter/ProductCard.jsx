import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const ProductCard = ({ product, onAdd }) => {
  const { items } = useOrderBuilder();

  const productId = product.id || product._id || product.Id;
  const productStock = Number(product.stock ?? product.Stock ?? 0);
  const productPrice = Number(product.price ?? product.Price ?? 0);
  const productName = product.name || product.Name || "Producto";
  const productDescription = product.description || product.Description || "";
  const productImageUrl = product.imageUrl || product.ImageUrl || "";

  const productItems = items.filter((item) => item.productId === productId);
  const quantityInCart = productItems.reduce((sum, item) => sum + item.quantity, 0);
  const isOutOfStock = productStock <= 0;
  const isLowStock = productStock > 0 && productStock <= 5;
  const isInCart = quantityInCart > 0;
  const totalPrice = isInCart ? productPrice * quantityInCart : productPrice;
  const handleImageAdd = () => {
    if (!isOutOfStock) onAdd(product);
  };

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border transition-all duration-200 ${
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
        <div className="absolute left-2.5 top-2.5 z-20 flex h-8 min-w-8 items-center justify-center rounded-lg border border-cyan-300/50 bg-cyan-400 px-2 text-[10px] font-black text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
          {quantityInCart}x
        </div>
      )}

      <div
        role="button"
        tabIndex={isOutOfStock ? -1 : 0}
        aria-label={isOutOfStock ? `${productName} agotado` : `Agregar ${productName}`}
        onClick={handleImageAdd}
        onKeyDown={(event) => {
          if (isOutOfStock) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleImageAdd();
          }
        }}
        className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-800 sm:aspect-square lg:aspect-[4/3] ${
          isOutOfStock ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {productImageUrl ? (
          <img
            src={productImageUrl}
            alt={productName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-slate-800" />
        )}

        <div className="absolute right-2.5 top-2.5 z-20">
          <span
            className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase backdrop-blur-md ${
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
        {!isOutOfStock && (
          <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-center text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 sm:opacity-100 lg:opacity-0">
            Toca imagen para agregar
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-2">
          <h3 className="mb-1 line-clamp-2 text-sm font-black uppercase tracking-tight text-white sm:text-base">
            {productName}
          </h3>
          <p className="line-clamp-2 text-[9px] italic leading-relaxed text-slate-500 sm:text-[10px]">
            {productDescription}
          </p>
        </div>

        <div className="mt-auto border-t border-slate-800/60 pt-2.5">
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
              {isInCart ? "Subtotal" : "Precio"}
            </span>
            <span className="text-lg font-black tracking-tighter text-emerald-400 sm:text-xl">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (!isOutOfStock) onAdd(product);
              }}
              disabled={isOutOfStock}
              className={`w-full rounded-[0.95rem] py-2.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all ${
                isOutOfStock
                  ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-600"
                  : isInCart
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              }`}
            >
              {isOutOfStock ? "Agotado" : isInCart ? "Agregar otro" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
