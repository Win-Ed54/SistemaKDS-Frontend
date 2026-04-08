import { Navigate } from "react-router-dom";
import { clearAuthStorage, getAuthValue } from "../services/authStorage";

const RoleProtectedRoute = ({ children, role }) => {
  const token = getAuthValue("token");
  const userRole = getAuthValue("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif" }}>
        <h2>Acceso Denegado</h2>
        <p>
          Tu rol es <b>{userRole}</b>, pero esta pagina requiere ser <b>{role}</b>.
        </p>
        <button onClick={() => (window.location.href = "/login")}>Volver al Inicio</button>
        <br />
        <br />
        <button
          onClick={() => {
            clearAuthStorage();
            localStorage.removeItem("user_name");
            window.location.href = "/login";
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
