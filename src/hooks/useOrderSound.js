import { useEffect, useRef } from "react";
import useOrderStore from "../store/orderStore";
import { onOrderCancelled } from "../services/signalrService";

const STORAGE_KEY = "kds.kitchen.sound";
const URGENT_MINUTES = 8;
const SOUND_SOURCES = {
  newOrder: "/sounds/new-order.mp3",
  urgentOrder: "/sounds/urgent-order.mp3",
  cancelOrder: "/sounds/cancel-order.mp3",
  readyOrder: "/sounds/ready-order.mp3",
};

const readStoredSettings = () => {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return { muted: false, volume: 0.5 };

    const parsed = JSON.parse(rawValue);
    return {
      muted: Boolean(parsed?.muted),
      volume: Number.isFinite(parsed?.volume) ? Math.min(1, Math.max(0, parsed.volume)) : 0.5,
    };
  } catch {
    return { muted: false, volume: 0.5 };
  }
};

const useOrderSound = () => {
  const orders = useOrderStore((state) => state.orders);
  const previousOrderIdsRef = useRef(new Set());
  const urgentAlertedOrderIdsRef = useRef(new Set());
  const settingsRef = useRef(readStoredSettings());

  const persistSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsRef.current));
    } catch {
      // Si el navegador bloquea el almacenamiento, el sonido sigue funcionando en memoria.
    }
  };

  const playSound = (type) => {
    if (settingsRef.current.muted) return;

    const source = SOUND_SOURCES[type] || SOUND_SOURCES.newOrder;
    const audio = new Audio(source);
    audio.volume = settingsRef.current.volume;
    audio.play().catch((err) => {
      console.warn(
        `No se pudo reproducir el sonido "${type}". Se requiere interaccion previa o falta el archivo.`,
        err
      );
    });
  };

  const playNewOrderSound = () => playSound("newOrder");
  const playUrgentOrderSound = () => playSound("urgentOrder");
  const playCancelOrderSound = () => playSound("cancelOrder");
  const playReadyOrderSound = () => playSound("readyOrder");

  useEffect(() => {
    const pendingOrders = orders.filter((order) => Number(order?.status) === 0);
    const currentIds = new Set(
      pendingOrders
        .map((order) => String(order?.id || order?._id || order?.Id || "").trim())
        .filter(Boolean),
    );

    const hasNewPendingOrder = Array.from(currentIds).some(
      (id) => !previousOrderIdsRef.current.has(id),
    );

    if (hasNewPendingOrder) playNewOrderSound();

    pendingOrders.forEach((order) => {
      const orderId = String(order?.id || order?._id || order?.Id || "").trim();
      if (!orderId || urgentAlertedOrderIdsRef.current.has(orderId)) return;

      const createdAt = new Date(order?.createdAt || order?.CreatedAt || 0).getTime();
      if (!Number.isFinite(createdAt) || createdAt <= 0) return;

      const elapsedMinutes = (Date.now() - createdAt) / 60000;
      if (elapsedMinutes >= URGENT_MINUTES) {
        urgentAlertedOrderIdsRef.current.add(orderId);
        playUrgentOrderSound();
      }
    });

    previousOrderIdsRef.current = currentIds;

    const activeOrderIds = new Set(
      (orders || [])
        .map((order) => String(order?.id || order?._id || order?.Id || "").trim())
        .filter(Boolean),
    );

    urgentAlertedOrderIdsRef.current.forEach((id) => {
      if (!activeOrderIds.has(id)) {
        urgentAlertedOrderIdsRef.current.delete(id);
      }
    });
  }, [orders]);

  useEffect(() => {
    const unsubscribeCancelled = onOrderCancelled(() => {
      playCancelOrderSound();
    });

    return () => {
      unsubscribeCancelled?.();
    };
  }, []);

  return {
    playSound,
    playNewOrderSound,
    playUrgentOrderSound,
    playCancelOrderSound,
    playReadyOrderSound,
    getSettings: () => settingsRef.current,
    setMuted: (muted) => {
      settingsRef.current = { ...settingsRef.current, muted: Boolean(muted) };
      persistSettings();
    },
    setVolume: (volume) => {
      settingsRef.current = {
        ...settingsRef.current,
        volume: Math.min(1, Math.max(0, Number(volume) || 0)),
      };
      persistSettings();
    },
  };
};

export default useOrderSound;
