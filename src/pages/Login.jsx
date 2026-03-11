import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        throw new Error("Credenciales incorrectas");
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error("El servidor no devolvió token");
      }

      // guardar token
      localStorage.setItem("token", data.token);

      // redirigir
      window.location.href = "/";

    } catch (err) {

      console.error("Error login:", err);
      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{padding:40}}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>

        <input
          placeholder="Usuario"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <br/><br/>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <br/><br/>

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {error && (
          <p style={{color:"red"}}>
            {error}
          </p>
        )}

      </form>
    </div>
  );
}
