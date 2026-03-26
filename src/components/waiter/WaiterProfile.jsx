import React, { useEffect, useState, useCallback } from 'react';
import { getWaiterOrdersToday } from '../../services/api.service';
import { logout } from '../../services/authService';
import { 
  onOrderReady, 
  onOrderPreparing, 
  onOrderDelivered, 
  onReceiveOrder 
} from '../../services/signalrService';

const WaiterProfile = ({ user, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getWaiterOrdersToday(user.username);
      // Mantenemos la lista ordenada: los más recientes primero
      setOrders(Array.isArray(data) ? [...data].reverse() : []);
    } catch (err) {
      console.error("Error cargando actividad:", err);
    } finally {
      setLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      console.log("⚡ Actualizando historial del mesero por señal de red...");
      fetchOrders();
    };
    
    // ✅ Usamos los eventos con el callback de actualización
    onReceiveOrder(handleUpdate); 
    onOrderReady(handleUpdate);
    onOrderPreparing(handleUpdate);
    onOrderDelivered(handleUpdate);

  }, [fetchOrders]);

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => [2, 3, "Ready", "Delivered"].includes(o.status)).length,
    pending: orders.filter(o => [0, 1, "Pending", "Preparing"].includes(o.status)).length
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00FFFF]/10 rounded-full blur-[80px]" />

        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border-2 border-[#00FFFF] flex items-center justify-center text-[#00FFFF] font-black text-4xl mb-4 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{user.username}</h2>
          <span className="text-[9px] text-[#39FF14] font-black uppercase tracking-[0.3em] mt-2 bg-[#39FF14]/10 px-3 py-1 rounded-full border border-[#39FF14]/20">
            Sesión Activa
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatBox label="Total"   value={stats.total}     colorClass="text-white" />
          <StatBox label="Listas"  value={stats.delivered} colorClass="text-[#39FF14]" />
          <StatBox label="En Cola" value={stats.pending}   colorClass="text-[#FFFF00]" />
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">Actividad Reciente</p>
          <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-[10px] font-black uppercase border-2 border-dashed border-slate-800 rounded-3xl">Sin actividad hoy</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                  <div>
                    <p className="text-xs font-black text-white uppercase">Mesa {order.tableNumber}</p>
                    <p className="text-[9px] text-slate-500 font-bold">
                       {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       <span className="ml-2 opacity-50">#{order.id?.toString().slice(-4)}</span>
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-800 text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all">
            Volver a la Terminal
          </button>
          <button onClick={() => { logout(); window.location.href = "/login"; }} className="w-full py-4 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all">
            Finalizar Turno
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, colorClass }) => (
  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 text-center">
    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">{label}</p>
    <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
    const sMap = { "Pending": 0, "Preparing": 1, "Ready": 2, "Delivered": 3 };
    const s = typeof status === "string" ? sMap[status] : status;
    const config = {
        0: { text: "Cola", color: "text-[#FFFF00] bg-[#FFFF00]/10" },
        1: { text: "Cocina", color: "text-[#00FFFF] bg-[#00FFFF]/10" },
        2: { text: "Listo", color: "text-[#39FF14] bg-[#39FF14]/10 animate-pulse" },
        3: { text: "Entregado", color: "text-slate-500 bg-slate-800" }
    };
    const { text, color } = config[s] || { text: "...", color: "text-slate-500" };
    return <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${color}`}>{text}</span>;
};

export default WaiterProfile;
