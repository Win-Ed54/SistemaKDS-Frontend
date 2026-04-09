import React from 'react';

const CategorySelection = ({ onSelectCategory }) => {
  const categories = [
  {
    id: 'Hamburguesas',
    name: 'Hamburguesas',
    image: '/images/categorias/hamburguesas.jpg'
  },
  {
    id: 'Pollo',
    name: 'Pollo',
    image: '/images/categorias/pollo.jpg'
  },
  {
    id: 'Acompañamientos',
    name: 'Acompañamientos',
    image: '/images/categorias/acompañamientos.jpg'
  },
  {
    id: 'Postres',
    name: 'Postres',
    image: '/images/categorias/postres.jpg'
  },
  {
    id: 'Bebidas',
    name: 'Bebidas',
    image: '/images/categorias/bebidas.jpg'
  },
  {
    id: 'Ensaladas',
    name: 'Ensaladas',
    image: '/images/categorias/ensaladas.jpg'
  }
];

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-5">
      <div className="mb-5 py-5">
        <h1 className="m-0 text-left text-3xl font-bold text-[#333]">Menu</h1>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 px-2.5 max-md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] max-md:gap-[15px] max-[480px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] max-[480px]:gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] active:-translate-y-1"
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="relative h-[220px] w-full overflow-hidden bg-[#f8f8f8] max-md:h-40 max-[480px]:h-[140px]">
              <img 
                src={category.image}
                alt={category.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                className="hidden h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f0f0f0_0%,#e0e0e0_100%)]"
                style={{ display: 'none' }}
              >
                <span className="text-6xl opacity-30">🍽️</span>
              </div>
            </div>

            <div className="bg-white p-5 text-center max-md:p-[15px]">
              <h3 className="m-0 text-[1.1rem] font-bold capitalize text-[#333] max-md:text-[0.95rem]">
                {category.name}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySelection;
