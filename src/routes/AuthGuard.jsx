import { Navigate } from "react-router-dom";
import { getAuthValue } from "../services/authStorage";

export default function AuthGuard({ children }) {
  const token = getAuthValue("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
