import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUserRole } from "../services/authService";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {

    try {

      await login(username, password);

      const role = getUserRole();

      if (role === "kitchen") navigate("/kitchen");
      if (role === "waiter") navigate("/waiter");
      if (role === "admin") navigate("/kitchen");

    } catch (err) {
      alert("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="p-10">

      <h2 className="text-xl mb-4">Login KDS</h2>

      <input
        className="border p-2 block mb-3"
        placeholder="Usuario"
        value={username}
        onChange={(e)=>setUsername(e.target.value)}
      />

      <input
        className="border p-2 block mb-3"
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button
        className="bg-blue-500 text-white p-2"
        onClick={handleLogin}
      >
        Iniciar sesión
      </button>

    </div>
  );
}
