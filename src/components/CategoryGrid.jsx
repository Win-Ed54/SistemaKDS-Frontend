import React from 'react';

const categories = [
  { name: 'Hamburguesas', img: '/assets/images/menu/HamburguesaDeCarne.png' },
  { name: 'Pollo', img: '/assets/images/menu/Pollo.png' },
  { name: 'Bebidas', img: '/assets/images/menu/Bebidas.png' },
  { name: 'Desayunos', img: '/assets/images/menu/Desayunos.png' },
  { name: 'Ensaladas', img: '/assets/images/menu/Ensalada.png' },
  { name: 'Postres', img: '/assets/images/menu/Postres.png' }
];

const CategoryGrid = ({ onSelectCategory }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-2">
      {categories.map((cat) => (
        <div 
          key={cat.name}
          onClick={() => onSelectCategory(cat.name)}
          className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden"
        >
          {/* Efecto de resplandor al pasar el mouse */}
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full aspect-square mb-6 transform group-hover:scale-110 transition-transform duration-500">
              <img 
                src={cat.img} 
                alt={cat.name} 
                className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            <h3 className="text-center font-black text-white uppercase tracking-tighter text-xl group-hover:text-cyan-400 transition-colors">
              {cat.name}
            </h3>
            
            <div className="mt-2 w-12 h-1 bg-slate-800 rounded-full group-hover:w-20 group-hover:bg-cyan-500 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryGrid;