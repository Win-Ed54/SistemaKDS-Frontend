import * as signalR from "@microsoft/signalr";

const HUB_URL = "http://localhost:5162/ordersHub";

const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

let currentGroups = [];
let handlersRegistered = false;

/**
 * Inicia conexión SignalR
 * @param {Array<string>} groups
 * @param {Function} setStatus
 */
export const startConnection = async (groups = [], setStatus) => {

    // 🛑 Evitar múltiples inicios
    if (connection.state === signalR.HubConnectionState.Connected) return;
    if (connection.state === signalR.HubConnectionState.Connecting) return;

    try {
        await connection.start();
        console.log(">>> Conectado a SignalR");

        currentGroups = groups;

        // 🔥 Unirse a grupos
        for (const group of groups) {
            await joinGroup(group);
        }

        if (setStatus) setStatus(true);

    } catch (err) {
        console.error("Error SignalR:", err);

        if (setStatus) setStatus(false);

        setTimeout(() => startConnection(groups, setStatus), 5000);
    }

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

            // 🔥 Reunirse a grupos otra vez
            for (const group of currentGroups) {
                await joinGroup(group);
            }

            if (setStatus) setStatus(true);
        });

        connection.onclose(() => {
            console.warn("Conexión cerrada");
            if (setStatus) setStatus(false);
        });
    }
};

// ---------------------------
// 📌 JOIN GROUP
// ---------------------------
export const joinGroup = async (group) => {
    if (connection.state !== signalR.HubConnectionState.Connected) return;

    try {
        switch (group) {
            case "cocina":
                await connection.invoke("JoinKitchenGroup");
                break;

            case "waiters":
                await connection.invoke("JoinWaiterGroup");
                break;
        }

        console.log(`>>> Unido al grupo: ${group}`);

    } catch (err) {
        console.error("Error join group:", err);
    }
};

// ---------------------------
// 📡 SAFE INVOKE (PRO TIP)
// ---------------------------
export const safeInvoke = async (method, ...args) => {
    if (connection.state !== signalR.HubConnectionState.Connected) {
        console.warn("SignalR no conectado");
        return;
    }

    try {
        await connection.invoke(method, ...args);
    } catch (err) {
        console.error("Error invoke:", err);
    }
};

export default connection;
