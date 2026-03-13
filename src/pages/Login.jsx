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

    try {

      const data = await login(username, password);

      if (data.role === "kitchen") navigate("/kitchen");
      if (data.role === "waiter") navigate("/waiter");
      if (data.role === "admin") navigate("/admin");

    } catch (error) {

      alert("Usuario o contraseña incorrectos");

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
