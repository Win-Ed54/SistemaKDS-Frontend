import request from "./api.service";

export const login = async (username, password) => {

  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await response.json();

  if (!data.token) {
    throw new Error("Login failed");
  }

  // guardar sesión
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);

  return data;
};

export const getSession = () => {

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) {
    return null;
  }

  return {
    token,
    role
  };

};

export const logout = () => {

  localStorage.removeItem("token");
  localStorage.removeItem("role");

};

export const getProducts = async () => {

  const res = await fetch(`${API}/products`);
  return await res.json();

};

export const getTables = async () => {

  const res = await fetch(`${API}/tables`);
  return await res.json();

};