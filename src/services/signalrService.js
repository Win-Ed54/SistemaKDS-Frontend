import * as signalR from "@microsoft/signalr";

// ---------------------------
// 🔧 CONFIG
// ---------------------------
console.log("API:", import.meta.env.VITE_API_URL);
console.log("HUB:", import.meta.env.VITE_HUB_URL);

const HUB_URL = import.meta.env.VITE_HUB_URL;

if (!HUB_URL) {
    throw new Error("VITE_HUB_URL no definido");
}

// ---------------------------
// 🔌 CONEXIÓN
// ---------------------------
const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // 🔥 mejora reconexión
    .configureLogging(signalR.LogLevel.Information)
    .build();

let currentGroups = [];
let handlersRegistered = false;

// ---------------------------
// 🔁 START CON RETRY REAL
// ---------------------------
const startWithRetry = async (groups = [], setStatus) => {

    // 🔥 loop hasta conectar
    while (connection.state !== signalR.HubConnectionState.Connected) {
        try {
            console.log("Intentando conectar...");
            await connection.start();
            console.log(">>> Conectado a SignalR");
            break;
        } catch (err) {
            console.error("Error conectando. Reintentando...", err);

            if (setStatus) setStatus(false);

            // esperar antes de reintentar
            await new Promise(res => setTimeout(res, 5000));
        }
    }

    // guardar grupos actuales
    currentGroups = groups;

    // 🔥 re-unirse a grupos
    for (const group of groups) {
        await joinGroup(group);
    }

    if (setStatus) setStatus(true);
};

// ---------------------------
// 🚀 START CONNECTION
// ---------------------------
export const startConnection = async (groups = [], setStatus) => {

    // evitar múltiples conexiones
    if (connection.state === signalR.HubConnectionState.Connected) return;
    if (connection.state === signalR.HubConnectionState.Connecting) return;

    await startWithRetry(groups, setStatus);

    // ---------------------------
    // 🔁 REGISTRAR EVENTOS SOLO UNA VEZ
    // ---------------------------
    if (!handlersRegistered) {
        handlersRegistered = true;

        connection.onreconnecting(() => {
            console.warn("Reconectando...");
            if (setStatus) setStatus(false);
        });

        connection.onreconnected(async () => {
            console.log("Reconectado");

            // 🔥 volver a unirse a grupos
            for (const group of currentGroups) {
                await joinGroup(group);
            }

            if (setStatus) setStatus(true);
        });

        connection.onclose(async () => {
            console.warn("Conexión cerrada. Reintentando...");

            if (setStatus) setStatus(false);

            // 🔥 reconectar automáticamente
            await startWithRetry(currentGroups, setStatus);
        });
    }
};

// ---------------------------
// 📌 JOIN GROUP
// ---------------------------
export const joinGroup = async (group) => {

    if (connection.state !== signalR.HubConnectionState.Connected) {
        console.warn("No conectado. No se puede unir al grupo:", group);
        return;
    }

    try {
        if (group === "cocina") {
            await safeInvoke("JoinKitchenGroup");
        }

        if (group === "waiters") {
            await safeInvoke("JoinWaiterGroup");
        }

        console.log(`>>> Unido al grupo: ${group}`);

    } catch (err) {
        console.error("Error join group:", err);
    }
};

// ---------------------------
// 📡 SAFE INVOKE (ANTI ERROR)
// ---------------------------
export const safeInvoke = async (method, ...args) => {

    if (connection.state !== signalR.HubConnectionState.Connected) {
        console.warn(`No conectado. No se puede ejecutar ${method}`);
        return;
    }

    try {
        await connection.invoke(method, ...args);
    } catch (err) {
        console.error(`Error en ${method}:`, err);
    }
};

// ---------------------------
// 📤 EXPORT
// ---------------------------
export default connection;
