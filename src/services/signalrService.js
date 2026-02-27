import * as signalR from "@microsoft/signalr";

const HUB_URL = `${import.meta.env.VITE_API_URL}/ordersHub`;

const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect() 
    .withStatefulReconnect({ bufferSize: 100000 }) 
    .build();

/**
 * @param {Function} setStatus - Función para actualizar el estado visual (ej. setIsConnected)
 */
export const startConnection = async (setStatus) => {
    if (connection.state === signalR.HubConnectionState.Disconnected) {
        try {
            await connection.start();
            console.log(">>> KDS Conectado al Servidor de Tiempo Real");
            
            //grupo dinámico
            if (groupMethodName) {
                await connection.invoke(groupMethodName);
                console.log(`>>> Unido al grupo mediante: ${groupMethodName}`);
            }

            if (setStatus) setStatus(true);


        } catch (err) {
            console.error(">>> Error al conectar con SignalR:", err);
            if (setStatus) setStatus(false);
            setTimeout(() => startConnection(setStatus), 5000);
        }
    }

    // Suscribirse a eventos de reconexión para actualizar la UI automáticamente
    connection.onreconnecting(() => {
        if (setStatus) setStatus(false);
        console.warn(">>> Perdiendo conexión... reconectando");
    });

    connection.onreconnected(() => {
        if (setStatus) setStatus(true);
        console.log(">>> Conexión restaurada");
    });
};

export default connection;