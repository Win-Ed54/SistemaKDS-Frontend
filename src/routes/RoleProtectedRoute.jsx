import { Navigate } from "react-router-dom";
import { clearAuthStorage, getAuthValue } from "../services/authStorage";
import { getAppPath } from "../config/appPaths";

const RoleProtectedRoute = ({ children, role }) => {
  const token = getAuthValue("token");
  const userRole = getAuthValue("role");
  const normalizedUserRole = String(userRole || "").trim().toLowerCase();
  const requiredRole = String(role || "").trim().toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && normalizedUserRole !== requiredRole) {
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
