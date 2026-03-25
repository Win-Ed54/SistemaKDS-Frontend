
import React, { useEffect, useState } from 'react';
import { getWaiterOrdersToday } from '../../services/api.service';

const WaiterProfile = ({ user, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getWaiterOrdersToday(user.username);
        setOrders(data);
      } catch (err) {
        console.error("Error al cargar actividad:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user.username]);

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.status === 3).length, // Status 3 = Delivered
    pending: orders.filter(o => o.status < 3 && o.status !== 4).length // Status 4 = Cancelled
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Botón cerrar */}
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Header: Avatar Neon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-[#00FFFF]/5 border-2 border-[#00FFFF] flex items-center justify-center text-[#00FFFF] font-black text-4xl mb-4 shadow-[0_0_20px_rgba(0,255,255,0.2)] animate-pulse">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{user.username}</h2>
          <span className="text-[10px] text-[#00FFFF] font-black uppercase tracking-[0.3em] mt-1">Nivel: Senior Waiter</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatBox label="Total" value={stats.total} color="slate-400" />
          <StatBox label="Listas" value={stats.delivered} color="[#39FF14]" />
          <StatBox label="En Cola" value={stats.pending} color="[#FFFF00]" />
        </div>

        {/* Lista de Órdenes del Día */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Actividad Reciente</p>
          {loading ? (
            <div className="text-center py-4 text-slate-600 text-xs italic">Cargando datos...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-4 text-slate-600 text-xs italic uppercase">Sin órdenes hoy</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-200 uppercase">Mesa {order.tableNumber}</p>
                  <p className="text-[9px] text-slate-500 font-bold">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            ))
          )}
        </div>

        {/* Footer: Logout */}
        <button onClick={handleLogout} className="w-full py-4 rounded-2xl border border-red-500/20 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95">
          Cerrar Sesión Segura
        </button>
      </div>
    </div>
  );
};

// Sub-componentes internos para limpieza
const StatBox = ({ label, value, color }) => (
  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800 text-center">
    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">{label}</p>
    <p className={`text-xl font-black text-${color}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
    const config = {
        0: { text: "Pendiente", color: "text-[#FFFF00] bg-[#FFFF00]/10" },
        1: { text: "Cocinando", color: "text-[#00FFFF] bg-[#00FFFF]/10" },
        2: { text: "Listo", color: "text-[#39FF14] bg-[#39FF14]/10" },
        3: { text: "Entregado", color: "text-slate-400 bg-slate-800" },
        4: { text: "Cancelado", color: "text-red-500 bg-red-500/10" }
    };
    const { text, color } = config[status] || config[0];
    return <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${color}`}>{text}</span>;
};

export default WaiterProfile;
