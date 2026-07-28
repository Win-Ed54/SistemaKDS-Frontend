# Arquitectura Frontend

## Capas

- `src/pages`
  Pantallas de autenticacion y cambio de contrasena.
- `src/views`
  Pantallas completas por rol: mesero, cocina, caja, host y admin.
- `src/components`
  Bloques reutilizables por dominio y componentes comunes.
- `src/hooks`
  Orquestan carga inicial, sincronizacion en tiempo real y logica reusable de vista.
- `src/store`
  Estado global con Zustand.
- `src/services`
  Integracion con API, SignalR, almacenamiento local y reinicio de sesion.
- `src/utils`
  Normalizacion, sanitizacion y helpers puros.
- `src/config`
  Paths y resolucion de variables de entorno en runtime.

## Flujo de datos

1. Una vista consume hooks.
2. El hook invoca servicios HTTP o SignalR.
3. Los resultados se normalizan en stores.
4. Los componentes renderizan el estado ya preparado.

## Archivos clave

- `src/services/api.service.js`
  Cliente HTTP autenticado con refresh token compartido.
- `src/services/signalrService.js`
  Conexion unica al hub, deduplicacion de eventos y callbacks por dominio.
- `src/store/orderBuilderStore.js`
  Carrito del mesero con borradores por mesa o destino.
- `src/store/orderStore.js`
  Fuente comun de ordenes activas.
- `src/hooks/useKitchenOrders.js`
  Ejemplo de sincronizacion hibrida REST + SignalR.

## Criterios de mantenimiento

- La normalizacion de payloads debe vivir en `store`, `service` o `utils`, no repartida en muchos componentes.
- Las vistas deben consumir hooks o stores ya preparados y evitar repetir fetches directos.
- Los eventos SignalR pueden llegar duplicados con nombres distintos; centraliza esa defensa en `signalrService.js`.
