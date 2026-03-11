import { jwtDecode } from "jwt-decode";

const API_URL = "http://localhost:5162/api";

export const login = async (username, password) => {

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  if (!res.ok) {
    throw new Error("Credenciales incorrectas");
  }

  const data = await res.json();

  localStorage.setItem("token", data.token);

  return data.token;
};

export const getUserRole = () => {

  const token = localStorage.getItem("token");

  if (!token) return null;

  const decoded = jwtDecode(token);

  return decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
};

export const logout = () => {
  localStorage.removeItem("token");
};
