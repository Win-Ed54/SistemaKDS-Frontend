import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, getSession } from "../services/authService";

  export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  useEffect(() => {

    const session = getSession();

    if (!session) return;

    if (session.role === "kitchen") {
      navigate("/kitchen");
    }

    if (session.role === "waiter") {
      navigate("/waiter");
    }

    if (session.role === "admin") {
      navigate("/admin");
    }

  }, []);

  const handleLogin = async () => {
  if (!username || !password) {
    alert("Ingresa usuario y contraseña");
    return;
  }

  try {
    console.log("Intentando login con:", username);
    const data = await login(username, password);
    console.log("Respuesta del backend:", data);

    // ✅ Guardar token específico por rol (para signalrService)
    localStorage.setItem(`${data.role}_token`, data.token);

    const routes = {
      kitchen: "/kitchen",
      waiter: "/waiter", 
      admin: "/admin",
    };

    const route = routes[data.role];

    if (!route) {
      alert(`Rol desconocido: ${data.role}`);
      return;
    }

    // ✅ replace:true evita que el back-button regrese al login
    navigate(route, { replace: true });

  } catch (error) {
    console.error("Error completo:", error);
    alert(`Error: ${error.message}`);
  }
};
  return (

    <div style={styles.container}>

      <div style={styles.card}>

        <h2 style={styles.title}>KDS Login</h2>

        <input
          style={styles.input}
          placeholder="Usuario"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleLogin}>
          Iniciar sesión
        </button>

      </div>

    </div>

  );

}

const styles = {

  container:{
    height:"100vh",
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    background:"#121212"
  },

  card:{
    background:"#1e1e1e",
    padding:"40px",
    borderRadius:"12px",
    width:"320px",
    display:"flex",
    flexDirection:"column",
    gap:"15px",
    boxShadow:"0 0 15px rgba(0,0,0,0.6)"
  },

  title:{
    color:"#fff",
    textAlign:"center"
  },

  input:{
    padding:"12px",
    borderRadius:"6px",
    border:"none",
    fontSize:"16px",
    background:"#2a2a2a",
    color:"#fff"
  },

  button:{
    padding:"14px",
    border:"none",
    borderRadius:"8px",
    background:"#ff6b00",
    color:"#fff",
    fontWeight:"bold",
    fontSize:"16px",
    cursor:"pointer"
  }

};
