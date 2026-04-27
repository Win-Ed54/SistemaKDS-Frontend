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
- Sesion unica por usuario coordinada con backend
- Login siempre visible: si el backend no responde, se muestra en gris con estado `Sin conexion con servidor`
- Toma de pedidos para mesa o para llevar
- Destino para pedidos para llevar visible en cocina, caja y alertas del mesero
- Asignacion de mesa por host
- Permitir al mesero agregar mas productos a su mesa asignada
- Vista de pedidos listos para entrega
- Vista de limpieza para liberar mesas segun las ordenes del mesero
- Control de stock en tiempo real
- Reconciliacion del carrito cuando cambia el inventario
- Configuracion dinamica del KDS desde admin
- Reporte de platillos mas vendidos con actualizacion automatica
- Reconexion automatica de SignalR y reintentos de lectura HTTP
- Reinicio automatico de SignalR despues de login, refresh o cambio de sesion, sin requerir `F5`
- Cabeceras compactas en cocina, caja, host y admin para dejar mas espacio al trabajo principal
- Carga por pantalla con `React.lazy` para reducir el JavaScript inicial

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

### Segmentacion por rol

El backend ya no emite eventos con `Clients.All`. Cada pantalla recibe solo lo necesario:

- Cocina: ordenes nuevas, preparando, listas y canceladas.
- Caja: ordenes entregadas, pagadas y pendientes de cobro.
- Mesero: solo eventos de sus propias ordenes cuando estan listas, entregadas, pagadas o canceladas.
- Host: cambios de mesas y configuracion necesaria.
- Admin: eventos operativos amplios para monitoreo y control.

Esto reduce datos innecesarios en el cliente y evita que una vista reciba informacion de otra area.

## Mejoras recientes de interfaz

- Cocina prioriza las columnas `Pendiente` y `Preparando`; metricas superiores quedaron como chips compactos.
- Caja muestra sus metricas como chips compactos y mantiene el foco en cobros pendientes.
- Host muestra estado de sala en chips compactos y elimina tarjetas redundantes de cabecera.
- Admin tiene cabecera reducida con estado de conexion, sincronizacion y areas.
- Pedidos para llevar muestran destino operativo en caja, cocina y tarjetas/alertas del mesero.
- La reconexion compartida de SignalR evita estados falsos de `Sin conexion` al entrar en host, cocina, caja, admin o mesero justo despues del login.
- La pantalla de login ya no muestra overlay bloqueante de error; mantiene el formulario visible con reintento.
- Las rutas principales se cargan bajo demanda; login, cocina, host, mesero, admin y caja quedan separados en chunks.

## Seguridad en frontend

- Tokens se guardan en `sessionStorage` y se limpian en logout o sesion expirada.
- El cliente migra tokens legados desde `localStorage` a `sessionStorage` y remueve el valor anterior.
- El rol recibido en login y refresh se normaliza para evitar fallos por mayusculas o espacios.
- Las rutas protegidas comparan roles normalizados.
- SignalR usa `accessTokenFactory` para enviar el token al hub.
- SignalR prioriza el token del rol activo y reconstruye la conexion cuando cambian credenciales o se reemplaza la sesion.
- Si la sesion fue reemplazada por otro login, la vista actual pierde autorizacion y debe volver a autenticarse.
- Nginx agrega headers de seguridad:
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Las pantallas dependen de autorizacion real del backend; los guards del frontend son solo una barrera de navegacion.

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

## HTTPS/WSS

El contenedor normal usa `nginx.conf` en HTTP para desarrollo local. Para una instalacion interna profesional, usar la plantilla:

- `nginx.https.example.conf`

Esa plantilla redirige HTTP a HTTPS, sirve el frontend con TLS y mantiene `/ordersHub` como WebSocket seguro (`wss://`) cuando el sitio se abre por `https://`.

## Build

Build validado:

```powershell
npm run build
```

Salida:

- `dist/`

## Notas

- En el build puede aparecer una advertencia conocida de Rollup con `@microsoft/signalr`; no bloquea la compilacion.
- Si reaparece una advertencia por tamano de chunk, el siguiente ajuste recomendado es separar librerias pesadas en `manualChunks`.
- El README anterior era el template por defecto de Vite; este archivo ya documenta el proyecto real.
