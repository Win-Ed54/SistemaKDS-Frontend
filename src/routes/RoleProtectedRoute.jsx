import { Navigate } from "react-router-dom";
import { getUserRole } from "../services/authService";

const RoleProtectedRoute = ({ children, role }) => {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  const userRole = getUserRole();

  if (userRole !== role) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default RoleProtectedRoute;
