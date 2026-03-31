import { useState } from "react";
import api from "../api/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("1️⃣ Intentando login con:", email);
      
      const res = await api.post("/auth/admin/login", {
        email,
        password
      });

      console.log("2️⃣ Respuesta del servidor:", res.data);

      // Verificar que el usuario es superadmin
      const rolesPermitidos = ["superadmin", "superadministrador", "super_admin"];
      
      if (!rolesPermitidos.includes(res.data.user.rol)) {
        setError(`No tienes permisos de Super Admin. Tu rol es: ${res.data.user.rol}`);
        setLoading(false);
        return;
      }

      // Guardar token
      if (res.data.token) {
        localStorage.setItem("super_token", res.data.token);
        console.log("3️⃣ Token guardado correctamente");
        console.log("Token:", res.data.token.substring(0, 30) + "...");
        
        // Redirigir
        window.location.href = "/";
      } else {
        setError("No se recibió token del servidor");
      }

    } catch (err) {
      console.error("❌ Error en login:", err);
      console.error("Respuesta del error:", err.response?.data);
      
      setError(
        err.response?.data?.error ||
        err.response?.data?.mensaje ||
        "Error al iniciar sesión"
      );
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at top, #1a1a3a, #0a0a1f)"
    }}>
      <div style={{
        background: "rgba(10,10,31,0.7)",
        backdropFilter: "blur(10px)",
        padding: "50px",
        borderRadius: "30px",
        border: "2px solid rgba(108,60,240,0.3)",
        boxShadow: "0 0 100px rgba(108,60,240,0.3)",
        width: "400px",
        textAlign: "center"
      }}>
        <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>🚀</h1>
        <h2 style={{
          background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "32px",
          marginBottom: "30px"
        }}>
          Acceso Galáctico
        </h2>

        {error && (
          <div style={{
            background: "rgba(255,0,0,0.1)",
            border: "1px solid rgba(255,60,214,0.3)",
            color: "#ff3cd6",
            padding: "10px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={login}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "15px",
              marginBottom: "15px",
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(108,60,240,0.3)",
              borderRadius: "15px",
              color: "white",
              fontSize: "16px",
              outline: "none"
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "15px",
              marginBottom: "25px",
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(108,60,240,0.3)",
              borderRadius: "15px",
              color: "white",
              fontSize: "16px",
              outline: "none"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
              border: "none",
              borderRadius: "15px",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? "ACCEDIENDO..." : "ENTRAR AL SISTEMA"}
          </button>
        </form>
      </div>
    </div>
  );
}