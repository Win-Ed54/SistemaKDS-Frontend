# Sistema KDS Frontend

Frontend del sistema KDS para restaurantes, construido con React y Vite. Esta aplicacion consume la API .NET del proyecto y sincroniza pedidos, mesas, stock y eventos operativos en tiempo real mediante SignalR.

## Stack

- React 19
- Vite 7
- React Router DOM 7
- Zustand
- Tailwind CSS 4
- SignalR client
- React Hot Toast

## Vistas principales

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

## Funcionalidad implementada

- Login por rol y almacenamiento de token por contexto
- Toma de pedidos para mesa o para llevar
- Asignacion de mesa por host
- Permitir al mesero agregar mas productos a su mesa asignada
- Vista de pedidos listos para entrega
- Vista de limpieza para liberar mesas segun las ordenes del mesero
- Control de stock en tiempo real
- Reconciliacion del carrito cuando cambia el inventario
- Configuracion dinamica del KDS desde admin
- Reporte de platillos mas vendidos con actualizacion automatica
- Reconexion automatica de SignalR y reintentos de lectura HTTP

## Estructura

- `src/views`: vistas principales por rol
- `src/components`: componentes reutilizables y modulos por area
- `src/hooks`: integraciones y sincronizacion
- `src/store`: estado global con Zustand
- `src/services`: API, autenticacion y SignalR
- `src/constants`: limites y utilidades operativas
- `src/context`: toast y soporte UI compartido

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

## Configuracion local

Variables usadas por el frontend:

- `VITE_HUB_URL`
- `VITE_DEV_API_TARGET`

Comportamiento actual:

- Vite corre en `5173`
- El proxy de desarrollo redirige `/api`, `/images` y `/ordersHub`
- `VITE_DEV_API_TARGET` por defecto apunta a `http://localhost:5162`

## Scripts

```powershell
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Ejecucion local

Ubicacion:

- `Sistema-KDS-Kitchen-Display-System-para-restaurantes---Frontend`

Pasos:

```powershell
npm install
npm run dev
```

Acceso:

- `http://localhost:5173`

## Integracion con backend

Este frontend espera que el backend este ejecutandose en:

- `http://localhost:5162`

Si deseas cambiarlo en desarrollo, puedes usar:

```powershell
$env:VITE_DEV_API_TARGET="http://TU_HOST:5162"
npm run dev
```

## Build

Build validado:

```powershell
npm run build
```

Salida:

- `dist/`

## Notas

- En el build puede aparecer una advertencia conocida de Rollup con `@microsoft/signalr`; no bloquea la compilacion.
- El README anterior era el template por defecto de Vite; este archivo ya documenta el proyecto real.
