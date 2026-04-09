import React, { useEffect, useState } from "react";
import CategorySelection from "./CategorySelection";
import ProductList from "./ProductList";

const WaiterMenu = () => {
  const [currentView, setCurrentView] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://localhost:7211/api/products");
      const data = await response.json();
      setAllProducts(data);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);

    const filtered = allProducts.filter(
      (product) => product.category?.toLowerCase() === categoryId.toLowerCase()
    );

    setFilteredProducts(filtered);
    setCurrentView("products");
  };

  const handleBackToCategories = () => {
    setCurrentView("categories");
    setSelectedCategory(null);
    setFilteredProducts([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(135deg,#0a1628_0%,#162238_100%)]">
        <div className="mb-5 h-[60px] w-[60px] animate-spin rounded-full border-4 border-[rgba(0,255,255,0.1)] border-t-[#00ffff]" />
        <p className="text-[1.2rem] font-semibold text-[#00ffff]">Cargando menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0a1628_0%,#162238_100%)]">
      {currentView === "categories" ? (
        <CategorySelection onSelectCategory={handleSelectCategory} />
      ) : (
        <div className="min-h-screen p-5 max-md:p-[15px]">
          <div className="mb-10 flex items-center justify-between rounded-[20px] border border-[rgba(0,255,255,0.2)] bg-[rgba(26,35,50,0.7)] px-[30px] py-[25px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[10px] max-md:flex-col max-md:gap-5 max-md:p-5">
            <button
              className="flex items-center gap-3 rounded-[15px] bg-[linear-gradient(135deg,#39FF14_0%,#00cc00_100%)] px-8 py-4 text-base font-extrabold uppercase tracking-[1.5px] text-[#0a1628] shadow-[0_4px_20px_rgba(57,255,20,0.4)] transition-all duration-300 hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(57,255,20,0.6)] active:-translate-y-px active:scale-[0.98] max-md:w-full max-md:justify-center"
              onClick={handleBackToCategories}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Volver a Categorias</span>
            </button>

            <h2 className="m-0 text-center text-[2.5rem] font-black uppercase tracking-[3px] text-[#00ffff] [text-shadow:0_0_25px_rgba(0,255,255,0.6),0_0_50px_rgba(0,255,255,0.3)] max-md:text-[1.8rem]">
              {selectedCategory?.toUpperCase()}
            </h2>
          </div>

          {filteredProducts.length > 0 ? (
            <ProductList products={filteredProducts} />
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <p className="mb-[30px] text-2xl font-light text-[#8b9dc3]">
                No hay productos disponibles en esta categoria
              </p>
              <button
                className="rounded-xl bg-[linear-gradient(135deg,#00ffff_0%,#0099cc_100%)] px-10 py-[15px] text-base font-bold uppercase tracking-[1px] text-[#0a1628] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,255,255,0.4)]"
                onClick={handleBackToCategories}
              >
                Volver a categorias
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WaiterMenu;
