import { Navigate } from "react-router-dom";

const RoleProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  // 1. Si no hay token, al login (Esto es seguro)
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. 🚩 EL FIX: Si el rol es incorrecto, NO uses <Navigate />
  // Si usas <Navigate to="/login" />, crearás el bucle infinito.
  if (role && userRole !== role) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif" }}>
        <h2>🚫 Acceso Denegado</h2>
        <p>Tu rol es <b>{userRole}</b>, pero esta página requiere ser <b>{role}</b>.</p>
        <button onClick={() => window.location.href = "/login"}>Volver al Inicio</button>
        <br /><br />
        <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // 3. Si todo está bien, mostrar el contenido
  return children;
};

export default RoleProtectedRoute;
