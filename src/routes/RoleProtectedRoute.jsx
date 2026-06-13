import { Navigate } from "react-router-dom";
import { clearAuthStorage, getAuthValue, getRoleRoute } from "../services/authStorage";
import { getAppPath } from "../config/appPaths";

const RoleProtectedRoute = ({ children, role }) => {
  const token = getAuthValue("token");
  const userRole = getAuthValue("role");
  const mustChangePassword = getAuthValue("must_change_password") === "true";
  const normalizedUserRole = String(userRole || "").trim().toLowerCase();
  const requiredRole = String(role || "").trim().toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/cambiar-contrasena" replace />;
  }

  if (requiredRole && normalizedUserRole !== requiredRole) {
    const fallbackRoute = getRoleRoute(normalizedUserRole);
    if (fallbackRoute && fallbackRoute !== "/login") {
      return <Navigate to={fallbackRoute} replace />;
    }

    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif" }}>
        <h2>Acceso Denegado</h2>
        <p>
          Tu rol es <b>{normalizedUserRole || "desconocido"}</b>, pero esta pagina requiere ser <b>{requiredRole}</b>.
        </p>
        <button onClick={() => (window.location.href = getAppPath("/login"))}>Volver al Inicio</button>
        <br />
        <br />
        <button
          onClick={() => {
            clearAuthStorage();
            window.location.href = getAppPath("/login");
          }}
        >
          Cerrar Sesion
        </button>
      </div>
    );
  }

  return children;
};

export default RoleProtectedRoute;
