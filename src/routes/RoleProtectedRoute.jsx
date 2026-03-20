import { Navigate } from "react-router-dom";

// Mapeo de rutas amigables por rol
const ROLE_ROUTES = {
  kitchen: "/cocina",
  waiter:  "/terminal",
  admin:   "/panel",
};

/**
 * Protege una ruta verificando:
 * 1. Que exista un token válido (no expirado)
 * 2. Que el rol del token coincida con el rol requerido
 *
 * Si no hay token → redirige a /login
 * Si el rol no coincide → redirige a la ruta correcta para ese rol
 */
const RoleProtectedRoute = ({ role, children }) => {
  const token = localStorage.getItem("token");
  const savedRole = localStorage.getItem("role");

  // Sin token → login
  if (!token || !savedRole) {
    return <Navigate to="/login" replace />;
  }

  // Verificar expiración del JWT sin librería externa
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = payload.exp && payload.exp * 1000 < Date.now();

    if (isExpired) {
      // Limpiar sesión expirada
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("waiter_token");
      localStorage.removeItem("kitchen_token");
      return <Navigate to="/login" replace />;
    }
  } catch {
    // Token malformado
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  // Rol incorrecto → redirigir a la vista correcta para ese rol
  if (savedRole !== role) {
    const correctRoute = ROLE_ROUTES[savedRole] ?? "/login";
    return <Navigate to={correctRoute} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
