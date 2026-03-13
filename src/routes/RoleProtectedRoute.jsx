import { Navigate } from "react-router-dom";

export default function RoleProtectedRoute({ role, children }) {

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && role !== userRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
