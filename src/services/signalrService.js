console.log("API:", import.meta.env.VITE_API_URL);
console.log("HUB:", import.meta.env.VITE_HUB_URL);

import * as signalR from "@microsoft/signalr";

// 🔥 usar HUB separado
const HUB_URL = import.meta.env.VITE_HUB_URL;
if(!HUB_URL){
    throw new Error("VITE_HUB_URL no definido");
}

const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

let currentGroups = [];
let handlersRegistered = false;

/**
 * Inicia conexión SignalR
 */
export const startConnection = async (groups = [], setStatus) => {

    if (connection.state === signalR.HubConnectionState.Connected) return;
    if (connection.state === signalR.HubConnectionState.Connecting) return;

    try {
        await connection.start();
        console.log(">>> Conectado a SignalR");

        currentGroups = groups;

        for (const group of groups) {
            await joinGroup(group);
        }

        if (setStatus) setStatus(true);

    } catch (err) {
        console.error("Error SignalR:", err);
        if (setStatus) setStatus(false);

        // 🔁 retry automático
        setTimeout(() => startConnection(groups, setStatus), 5000);
    }

    // 🔁 registrar eventos SOLO UNA VEZ
    if (!handlersRegistered) {
        handlersRegistered = true;

        connection.onreconnecting(() => {
            console.warn("Reconectando...");
            if (setStatus) setStatus(false);
        });

        connection.onreconnected(async () => {
            console.log("Reconectado");

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
        if (group === "cocina") {
            await connection.invoke("JoinKitchenGroup");
        }

        if (group === "waiters") {
            await connection.invoke("JoinWaiterGroup");
        }

        console.log(`>>> Unido al grupo: ${group}`);

    } catch (err) {
        console.error("Error join group:", err);
    }
};

// ---------------------------
// 📡 SAFE INVOKE
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
