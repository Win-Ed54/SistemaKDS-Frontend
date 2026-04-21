import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRouteForRole, getSession, login, logout } from "../services/authService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [healthState, setHealthState] = useState("checking");
  const [healthMessage, setHealthMessage] = useState("Verificando conexion con el servidor...");

  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    navigate(getRouteForRole(session.role), { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const checkServerHealth = async ({ silent = false } = {}) => {
      if (!navigator.onLine) {
        if (!cancelled) {
          setHealthState("error");
          setHealthMessage("No hay conexion a internet en este dispositivo.");
        }
        return;
      }

      if (!silent && !cancelled) {
        setHealthState("checking");
        setHealthMessage("Verificando conexion con el servidor...");
      }

      try {
        const response = await fetch("/api/auth/health", { cache: "no-store" });
        if (cancelled) return;

        if (response.ok) {
          setHealthState("ok");
          setHealthMessage("Servidor activo");
          return;
        }

        if (response.status === 404) {
          setHealthState("error");
          setHealthMessage("El endpoint de verificacion no existe en el backend actual. Reinicia o actualiza la API.");
          if (timerId) {
            window.clearInterval(timerId);
            timerId = null;
          }
          return;
        }

        setHealthState("error");
        setHealthMessage(`El servidor respondio con error ${response.status}.`);
      } catch {
        if (!cancelled) {
          setHealthState("error");
          setHealthMessage("No se pudo establecer conexion con el servidor.");
        }
      }
    };

    void checkServerHealth();
    timerId = window.setInterval(() => void checkServerHealth({ silent: true }), 10000);

    const handleOnline = () => void checkServerHealth();
    const handleOffline = () => {
      setHealthState("error");
      setHealthMessage("No hay conexion a internet en este dispositivo.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isServerReachable = healthState === "ok";

  const retryHealthCheck = async () => {
    if (!navigator.onLine) {
      setHealthState("error");
      setHealthMessage("No hay conexion a internet en este dispositivo.");
      return;
    }

    setHealthState("checking");
    setHealthMessage("Verificando conexion con el servidor...");

    try {
      const response = await fetch("/api/auth/health", { cache: "no-store" });
      if (response.ok) {
        setHealthState("ok");
        setHealthMessage("Servidor activo");
        return;
      }

      if (response.status === 404) {
        setHealthState("error");
        setHealthMessage("El endpoint de verificacion no existe en el backend actual. Reinicia o actualiza la API.");
        return;
      }

      setHealthState("error");
      setHealthMessage(`El servidor respondio con error ${response.status}.`);
    } catch {
      setHealthState("error");
      setHealthMessage("No se pudo establecer conexion con el servidor.");
    }
  };

  const handleLogin = async () => {
    if (!isServerReachable) {
      setError("El servidor no esta disponible en este momento.");
      return;
    }

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
        logout();
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

      {healthState === "checking" && (
        <div style={styles.statusScreen}>
          <div style={styles.statusCard}>
            <div style={styles.loader} />
            <h2 style={styles.statusTitle}>Cargando sistema</h2>
            <p style={styles.statusText}>{healthMessage}</p>
          </div>
        </div>
      )}

      {healthState === "error" && (
        <div style={styles.statusScreen}>
          <div style={styles.statusCard}>
            <div style={styles.errorIcon}>!</div>
            <h2 style={styles.statusTitle}>No se pudo iniciar el login</h2>
            <p style={styles.statusText}>{healthMessage}</p>
            <button style={styles.retryButton} onClick={retryHealthCheck}>
              Reintentar conexion
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <svg viewBox="0 0 120 120" width="90" height="90" style={styles.logoSvg(isServerReachable)}>
            <path d="M 60 15 A 45 45 0 0 1 105 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 22 A 38 38 0 0 1 98 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M 60 29 A 31 31 0 0 1 91 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M 60 105 A 45 45 0 0 1 15 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 98 A 38 38 0 0 1 22 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M 60 91 A 31 31 0 0 1 29 60" fill="none" stroke={isServerReachable ? "#1a6fff" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <circle cx="60" cy="15" r="3" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} />
            <circle cx="105" cy="60" r="3" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} />
            <circle cx="60" cy="105" r="3" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} />
            <circle cx="15" cy="60" r="3" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} />
            <circle cx="60" cy="22" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.7" />
            <circle cx="98" cy="60" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.7" />
            <circle cx="60" cy="98" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.7" />
            <circle cx="22" cy="60" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.7" />
            <circle cx="91" cy="33" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.6" />
            <circle cx="87" cy="38" r="1.5" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.5" />
            <circle cx="33" cy="87" r="2" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.6" />
            <circle cx="38" cy="83" r="1.5" fill={isServerReachable ? "#1a6fff" : "#94a3b8"} opacity="0.5" />
          </svg>
          <div style={styles.logoText}>
            <span style={styles.logoMain}>ALFA TECH</span>
            <span style={styles.logoSub}>DIGITAL SOLUTIONS</span>
          </div>
        </div>

        <div style={styles.statusBadge(isServerReachable)}>
          {isServerReachable ? "Servidor activo" : "Sin conexion con servidor"}
        </div>

        <div style={styles.divider} />
        <p style={styles.subtitle}>KDS - Acceso al sistema</p>

        <input
          style={styles.input}
          placeholder="Usuario"
          value={username}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              handleLogin();
            }
          }}
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              handleLogin();
            }
          }}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />

        <button
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : null),
          }}
          onClick={handleLogin}
          onMouseEnter={(event) => {
            if (loading) return;
            event.target.style.background = "#e05e00";
          }}
          onMouseLeave={(event) => {
            if (loading) return;
            event.target.style.background = "#ff6b00";
          }}
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Iniciar sesion"}
        </button>

        {error && (
          <p style={styles.errorBox}>
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
  statusScreen: {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "rgba(10,15,26,0.82)",
    backdropFilter: "blur(8px)",
    zIndex: 3,
    padding: "16px",
  },
  statusCard: {
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
    borderRadius: "24px",
    background: "linear-gradient(160deg, #ffffff 0%, #e8f0ff 60%, #dceeff 100%)",
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
    textAlign: "center",
  },
  loader: {
    width: "48px",
    height: "48px",
    borderRadius: "999px",
    border: "4px solid rgba(26,111,255,0.18)",
    borderTopColor: "#1a6fff",
    animation: "spin 1s linear infinite",
  },
  errorIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "999px",
    background: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 800,
  },
  statusTitle: {
    margin: 0,
    color: "#0a1628",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "0.5px",
  },
  statusText: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  retryButton: {
    marginTop: "6px",
    padding: "12px 18px",
    border: "none",
    borderRadius: "10px",
    background: "#1a6fff",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  card: {
    background: "linear-gradient(160deg, #ffffff 0%, #e8f0ff 60%, #dceeff 100%)",
    padding: "40px 36px",
    borderRadius: "24px",
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
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
  logoSvg: (isServerReachable) => ({
    filter: isServerReachable
      ? "drop-shadow(0 0 8px rgba(26,111,255,0.5))"
      : "grayscale(1) drop-shadow(0 0 6px rgba(148,163,184,0.35))",
    transition: "filter 0.2s ease",
  }),
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
  statusBadge: (isServerReachable) => ({
    alignSelf: "center",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "11px",
    fontWeight: 700,
    color: isServerReachable ? "#166534" : "#475569",
    background: isServerReachable ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.18)",
    border: `1px solid ${isServerReachable ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.35)"}`,
  }),
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
  buttonDisabled: {
    cursor: "not-allowed",
    opacity: 0.75,
  },
  errorBox: {
    color: "#991b1b",
    marginTop: "8px",
    fontSize: "13px",
    fontWeight: 700,
    textAlign: "center",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "10px",
    padding: "10px 12px",
  },
};
