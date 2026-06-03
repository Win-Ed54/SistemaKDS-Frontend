# Sistema KDS Frontend

Frontend del sistema KDS construido con React 19, Vite 7, Zustand, Tailwind CSS 4 y cliente SignalR.

## Vistas

- `/login`
- `/terminal`
- `/cocina`
- `/caja`
- `/panel`
- `/host`

## Roles

- `admin`
- `cashier`
- `host`
- `kitchen`
- `waiter`

## Comportamiento clave

- El mesero puede operar como `solo mesas`, `solo para llevar` o `mixto`.
- Host solo asigna mesas a meseros que pueden atender salon.
- Las ordenes del mesero y su historial se refrescan de inmediato.
- Delivery solicita direccion cuando aplica.
- Admin concentra operacion, inventario, equipo y ganancias.
- Varias vistas recuerdan el estado por usuario con `localStorage`.

## Implementacion final

- El panel de mesero permite cambiar una mesa asignada a pedido para llevar sin perder el contexto de la mesa origen.
- El destino para llevar se puede marcar como `Mesa N`, `Mostrador`, `Autoservicio` o `Delivery`; delivery solicita direccion.
- El carrito movil conserva instrucciones por producto y usa scroll interno para evitar que el boton `Confirmar orden` tape los productos.
- El carrito de escritorio reserva espacio para varios productos y usa barra visible cuando la orden crece.
- El boton de confirmacion deshabilitado usa contraste reforzado para que advertencias como nombre obligatorio sean legibles.
- Caja muestra `Cobro por mesa` y `Cobro por pedido`, con seleccion de cantidades pendientes por linea para cobros parciales.
- El registro de caja distingue cobro parcial, mesa completa y cobro total.
- Admin incluye registro administrativo de ordenes creadas, cobradas y canceladas con filtros por estado.
- Las tarjetas de producto cargan imagenes con `loading="lazy"` y `decoding="async"` para mejorar la velocidad inicial.

## Testers

- Edwin Fernandez
- Sorayda Lopez
- Michael Garcia
- Eduardo Diaz
- Miguel Zamora

## Configuracion

Variables soportadas:

- `VITE_API_URL`
- `VITE_BACKEND_URL`
- `VITE_HUB_URL`
- `VITE_DEV_API_TARGET`
- `VITE_BASE_PATH`

Referencia recomendada para produccion:

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

## Verificacion local

```powershell
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run preview
```

## Despliegue

- Publica esta carpeta como proyecto frontend.
- Mantiene `vercel.json` para fallback SPA.
- Usa las variables `VITE_*` apuntando al backend de Railway.
- Si publicas en una subruta, compila con `VITE_BASE_PATH` correcto.
- La imagen Docker ya instala dependencias con `pnpm install --frozen-lockfile`, asi que no usa `npm ci`.
