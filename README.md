# Sistema KDS Frontend

Frontend del sistema KDS para restaurantes, construido con React y Vite.

Esta aplicacion consume la API del proyecto y mantiene sincronizados pedidos, mesas, stock y estados operativos mediante SignalR.

## Stack

- React 19
- Vite 7
- React Router DOM 7
- Zustand
- Tailwind CSS 4
- SignalR client

## Rutas principales

- `/login`
- `/terminal`
- `/cocina`
- `/caja`
- `/panel`
- `/host`

## Roles soportados

- `waiter`
- `kitchen`
- `cashier`
- `admin`
- `host`

## Funcionalidad actual

- login por rol
- sesion unica por usuario
- cambio de sesion detectado sin necesidad de recargar
- pedidos para mesa y para llevar
- destino visible para pedidos para llevar
- prepago para llevar configurable desde admin
- asignacion de mesas por host
- sugerencia de `mejor ajuste` en host
- transferencia y liberacion de mesas segun estado operativo
- selector de mesas del mesero optimizado para desktop
- vista de ordenes listas para entrega
- vista de limpieza para liberar mesas
- bloqueo de nuevas ordenes en mesas que estan en limpieza
- resincronizacion de mesas despues de iniciar o terminar limpieza
- control visual de incidencias en admin
- control de stock en tiempo real
- reconciliacion del carrito cuando cambia inventario
- configuracion KDS desde admin
- actualizacion automatica de pedidos, mesas, pagos, stock y configuracion sin recarga manual
- reconexion automatica de SignalR al cambiar sesion o recuperar conexion
- carga diferida de vistas principales
- despliegue preparado para raiz del sitio o subruta mediante `VITE_BASE_PATH`

## Vistas destacadas

### Mesero

- puede trabajar con mesas asignadas y pedidos para llevar
- los pedidos para llevar quedan ligados al mesero que los creo
- ve solo sus ordenes listas
- recibe notificaciones de sus propios pedidos
- cuando cocina marca una orden como lista, la terminal del mesero la refleja de inmediato y luego resincroniza en segundo plano
- no puede seguir pidiendo en mesas que ya entraron en limpieza
- puede iniciar limpieza y liberar mesa con resincronizacion automatica

### Cocina

- recibe ordenes nuevas en tiempo real
- actualiza estados `Pending`, `Preparing` y `Ready`
- ve el destino operativo del pedido para llevar
- recibe pedidos para llevar despues del cobro cuando el prepago esta activo

### Caja

- gestiona cobros de ordenes entregadas
- cuando el prepago para llevar esta activo, cobra primero y la orden entra a cocina despues del pago completo
- refresca cuando aparece una nueva orden pendiente de prepago
- cuando el prepago para llevar esta activo, evita mostrar como cobro pendiente normal los pedidos para llevar que ya pertenecen a ese flujo
- soporta cobros individuales, agrupados y seguimiento de pendientes

### Host

- asigna mesas a comensales
- calcula `mejor ajuste` con mesas compatibles
- ve estado de ocupacion y limpieza del salon
- conserva relacion entre mesa y mesero asignado

### Admin

- monitorea ordenes, mesas, inventario e incidencias
- ajusta configuracion operativa del KDS
- puede liberar mesas segun el estado real del flujo
- distingue entre mesas libres, ocupadas, con cobro pendiente o en limpieza

## Tiempo real

La aplicacion se conecta al hub:

- `/ordersHub`

Sincroniza:

- nuevas ordenes
- cambios de estado
- ordenes listas
- ordenes pagadas
- ordenes canceladas
- stock actualizado
- producto agotado
- cambios de mesa
- configuracion KDS

## Segmentacion de eventos

Cada pantalla recibe solo lo que necesita:

- Cocina: ordenes nuevas y cambios de estado de cocina.
- Caja: cobros, pagos y ordenes pendientes de prepago.
- Mesero: eventos de sus propias ordenes, con actualizacion inmediata cuando una orden pasa a lista.
- Host: cambios de mesas y configuracion relacionada.
- Admin: eventos operativos amplios para monitoreo.

## Seguridad implementada

En frontend ya se considera:

- manejo de autenticacion por contexto de rol
- almacenamiento de sesion del lado cliente
- cierre de sesion al perder autorizacion
- proteccion de rutas por rol
- uso de token en SignalR segun rol activo
- reconstruccion de conexion cuando cambia la sesion
- segmentacion de datos recibidos por pantalla
- configuracion de despliegue con soporte para headers de seguridad desde Nginx

## Configuracion local

Variables usadas por el frontend:

- `VITE_API_URL`
- `VITE_BACKEND_URL`
- `VITE_HUB_URL`
- `VITE_DEV_API_TARGET`
- `VITE_BASE_PATH`

Comportamiento esperado:

- Vite corre en `5173`
- el proxy de desarrollo redirige `/api`, `/images` y `/ordersHub`
- en produccion `VITE_API_URL` debe apuntar a tu API de Railway, por ejemplo `https://tu-backend.up.railway.app/api`
- en produccion `VITE_BACKEND_URL` debe apuntar al origen del backend, por ejemplo `https://tu-backend.up.railway.app`
- si no defines `VITE_HUB_URL`, el frontend lo deriva desde `VITE_BACKEND_URL` o `VITE_API_URL`
- `VITE_DEV_API_TARGET` apunta al backend local
- `VITE_BASE_PATH` debe ajustarse si el frontend se publica en una subruta

## Scripts

```powershell
corepack pnpm install
corepack pnpm run dev
corepack pnpm run build
corepack pnpm run preview
corepack pnpm run lint
```

Lockfile y gestor:

- `packageManager`: `pnpm@11.1.1`
- lockfile principal: `pnpm-lock.yaml`
- el proyecto ya no usa `package-lock.json`

Motivo del cambio:

- Se migro de `npm` a `pnpm` para tener instalaciones mas reproducibles, mejor control sobre scripts de dependencias y un flujo Docker alineado con un lockfile unico.
- Durante la migracion se evitaron upgrades mayores riesgosos para no romper el frontend ni el build del contenedor.

## Ejecucion local

Ubicacion:

- `Sistema-KDS-Kitchen-Display-System-para-restaurantes---Frontend`

Pasos:

```powershell
corepack pnpm install
corepack pnpm run dev
```

Acceso:

- `http://localhost:5173`

## Integracion con backend

En desarrollo, este frontend espera un backend local accesible desde el proxy de Vite.

Si necesitas cambiar el destino:

```powershell
$env:VITE_DEV_API_TARGET="http://TU_HOST:5162"
corepack pnpm run dev
```

## Build

```powershell
corepack pnpm run build
```

Salida:

- `dist/`

## Despliegue

- El despliegue Docker incluido esta pensado para servir el frontend en la raiz del sitio.
- Si se publica en una subruta, se debe compilar con `VITE_BASE_PATH` apuntando a esa ruta.
- Para Vercel se incluye `vercel.json` con fallback SPA para que rutas como `/panel` o `/cocina` no fallen al recargar.
- `nginx.conf` protege `/assets/*` para evitar que el fallback del SPA responda `index.html` donde el navegador espera modulos JavaScript.
- El `Dockerfile` instala dependencias con `pnpm install --frozen-lockfile` y luego ejecuta `pnpm run build`.
- Si se reconstruye desde `docker compose`, no hace falta reinstalar dependencias manualmente dentro del contenedor.

## Variables Para Vercel

Configura estas variables en el proyecto del frontend:

- `VITE_API_URL=https://TU-BACKEND.up.railway.app/api`
- `VITE_BACKEND_URL=https://TU-BACKEND.up.railway.app`
- `VITE_HUB_URL=https://TU-BACKEND.up.railway.app/ordersHub`
- `VITE_BASE_PATH=/`

## Notas

- Las rutas principales se cargan bajo demanda para reducir el JavaScript inicial.
- En el build puede aparecer una advertencia conocida de Rollup con `@microsoft/signalr`; no bloquea la compilacion.
- La vista de caja separa el flujo de prepago para llevar del cobro normal de ordenes entregadas para reducir falsos pendientes visuales.
- La documentacion evita publicar secretos, credenciales o configuraciones internas sensibles.
