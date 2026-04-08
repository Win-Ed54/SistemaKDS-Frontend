import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRouteForRole, getSession, login } from "../services/authService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    navigate(getRouteForRole(session.role), { replace: true });
  }, [navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Ingresa usuario y contrasena");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await login(username, password);
      const route = getRouteForRole(data.role);

      if (!route || route === "/login") {
        setError(`Rol desconocido: ${data.role}`);
        return;
      }

      navigate(route, { replace: true });
    } catch (authError) {
      console.error("Error completo:", authError);

      if (authError.response?.status === 401) {
        setError("Usuario o contrasena incorrectos");
      } else if (authError.response?.status === 403) {
        setError("Usuario no autorizado");
      } else if (authError.response?.status === 500) {
        setError("Error del servidor, intenta mas tarde");
      } else if (!authError.response) {
        setError("No se pudo conectar al servidor");
      } else {
        setError("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />

      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <svg viewBox="0 0 120 120" width="90" height="90" style={styles.logoSvg}>
            <path d="M 60 15 A 45 45 0 0 1 105 60" fill="none" stroke="#1a6fff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 22 A 38 38 0 0 1 98 60" fill="none" stroke="#1a6fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M 60 29 A 31 31 0 0 1 91 60" fill="none" stroke="#1a6fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M 60 105 A 45 45 0 0 1 15 60" fill="none" stroke="#1a6fff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 98 A 38 38 0 0 1 22 60" fill="none" stroke="#1a6fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M 60 91 A 31 31 0 0 1 29 60" fill="none" stroke="#1a6fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <circle cx="60" cy="15" r="3" fill="#1a6fff" />
            <circle cx="105" cy="60" r="3" fill="#1a6fff" />
            <circle cx="60" cy="105" r="3" fill="#1a6fff" />
            <circle cx="15" cy="60" r="3" fill="#1a6fff" />
            <circle cx="60" cy="22" r="2" fill="#1a6fff" opacity="0.7" />
            <circle cx="98" cy="60" r="2" fill="#1a6fff" opacity="0.7" />
            <circle cx="60" cy="98" r="2" fill="#1a6fff" opacity="0.7" />
            <circle cx="22" cy="60" r="2" fill="#1a6fff" opacity="0.7" />
            <circle cx="91" cy="33" r="2" fill="#1a6fff" opacity="0.6" />
            <circle cx="87" cy="38" r="1.5" fill="#1a6fff" opacity="0.5" />
            <circle cx="33" cy="87" r="2" fill="#1a6fff" opacity="0.6" />
            <circle cx="38" cy="83" r="1.5" fill="#1a6fff" opacity="0.5" />
          </svg>
          <div style={styles.logoText}>
            <span style={styles.logoMain}>ALFA TECH</span>
            <span style={styles.logoSub}>DIGITAL SOLUTIONS</span>
          </div>
        </div>

        <div style={styles.divider} />
        <p style={styles.subtitle}>KDS - Acceso al sistema</p>

        <input
          style={styles.input}
          placeholder="Usuario"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setError(null);
          }}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />

        <button
          style={styles.button}
          onClick={handleLogin}
          onMouseEnter={(event) => {
            event.target.style.background = "#e05e00";
          }}
          onMouseLeave={(event) => {
            event.target.style.background = "#ff6b00";
          }}
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Iniciar sesion"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: "8px", fontSize: "13px" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(ellipse at 60% 40%, #0d1a2e 0%, #0a0f1a 60%, #121212 100%)",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(26,111,255,0.12) 1px, transparent 1px)",
    backgroundSize: "36px 36px",
    pointerEvents: "none",
  },
  card: {
    background: "linear-gradient(160deg, #ffffff 0%, #e8f0ff 60%, #dceeff 100%)",
    padding: "40px 36px",
    borderRadius: "16px",
    width: "340px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow:
      "0 0 0 1px rgba(26,111,255,0.15), 0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(26,111,255,0.08)",
    backdropFilter: "blur(12px)",
    position: "relative",
    zIndex: 1,
  },
  logoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  logoSvg: {
    filter: "drop-shadow(0 0 8px rgba(26,111,255,0.5))",
  },
  logoText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  logoMain: {
    color: "#0a1628",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "3px",
    fontFamily: "'Courier New', monospace",
  },
  logoSub: {
    color: "#1a6fff",
    fontSize: "9px",
    letterSpacing: "4px",
    fontFamily: "'Courier New', monospace",
    opacity: 0.9,
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(26,111,255,0.35), transparent)",
    margin: "2px 0",
  },
  subtitle: {
    color: "#3a4a6b",
    textAlign: "center",
    fontSize: "13px",
    margin: "0 0 4px 0",
    letterSpacing: "0.5px",
    fontFamily: "'Courier New', monospace",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(26,111,255,0.25)",
    fontSize: "15px",
    background: "rgba(255,255,255,0.75)",
    color: "#0a1628",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
  },
  button: {
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    background: "#ff6b00",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "background 0.2s",
    marginTop: "4px",
  },
};
