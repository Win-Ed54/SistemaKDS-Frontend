# Sistema KDS Frontend

Frontend del sistema KDS construido con React 19, Vite 7, Zustand, Tailwind CSS 4 y cliente SignalR.

## Pantallas

- `/login`
- `/terminal`
- `/cocina`
- `/caja`
- `/panel`
- `/host`

## Roles soportados

- `admin`
- `cashier`
- `host`
- `kitchen`
- `waiter`

## Lo mas importante del flujo actual

- El mesero puede operar como `solo mesas`, `solo para llevar` o `mixto`.
- Host solo asigna mesas a meseros que pueden atender salon.
- Las ordenes del mesero y su historial se refrescan de inmediato.
- Delivery pide direccion cuando aplica.
- Admin concentra operacion, inventario, equipo y ganancias.
- Varias vistas recuerdan estado por usuario con `localStorage`.

## Variables del frontend

- `VITE_API_URL`
- `VITE_BACKEND_URL`
- `VITE_HUB_URL`
- `VITE_DEV_API_TARGET`
- `VITE_BASE_PATH`

Regla recomendada para produccion:

- `VITE_API_URL=https://TU-BACKEND.up.railway.app/api`
- `VITE_BACKEND_URL=https://TU-BACKEND.up.railway.app`
- `VITE_HUB_URL=https://TU-BACKEND.up.railway.app/ordersHub`
- `VITE_BASE_PATH=/`

## Desarrollo local

```powershell
corepack pnpm install
corepack pnpm run dev
```

Dev server:

- `http://localhost:5173`

## Build

```powershell
corepack pnpm run build
corepack pnpm run preview
```

## Despliegue en Vercel

- Publica esta carpeta como proyecto frontend.
- Mantiene `vercel.json` para fallback SPA.
- Usa las variables `VITE_*` apuntando al backend de Railway.
- Si publicas en subruta, compila con `VITE_BASE_PATH` correcto.

## Buenas practicas de rendimiento

- Mantener imagenes optimizadas antes de subir productos.
- Evitar listas enormes visibles al mismo tiempo; varias vistas ya usan resumen + expandir.
- No abrir conexiones extra a la API fuera del flujo normal; SignalR ya resincroniza.
- Conservar `pnpm-lock.yaml` como lockfile unico.

## Scripts

```powershell
corepack pnpm run dev
corepack pnpm run build
corepack pnpm run preview
corepack pnpm run lint
```
