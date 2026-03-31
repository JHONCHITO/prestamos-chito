import React, { useState } from "react";
import { authAPI } from "../services/api";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!usuario || !password) {
      setError("Ingrese todos los campos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authAPI.cobradorLogin(usuario, password);
      localStorage.setItem("cobrador_token", res.data.token);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#f8fafc",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "16px",
    fontFamily: "inherit"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 16px",
            background: "linear-gradient(135deg,#1e40af,#1e40af)",
            borderRadius: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            boxShadow: "0 8px 32px rgba(20,184,166,0.4)"
          }}>
            {String.fromCodePoint(0x1F4A7)}
          </div>
          <h1 style={{ color: "#f8fafc", fontSize: "26px", fontWeight: "800", margin: "0 0 4px" }}>Gota a Gota</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Panel del Cobrador</p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px"
        }}>
          <h2 style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "700", margin: "0 0 24px", textAlign: "center" }}>
            Iniciar Sesion
          </h2>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "14px",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <input
            type="text"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Correo del cobrador"
            style={inputStyle}
          />

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Contrasena"
            style={{ ...inputStyle, marginBottom: "24px" }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading ? "rgba(20,184,166,0.5)" : "linear-gradient(135deg,#1e40af,#1e40af)",
              border: "none",
              borderRadius: "14px",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(20,184,166,0.4)",
              fontFamily: "inherit"
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>

        <p style={{ color: "#475569", fontSize: "12px", textAlign: "center", marginTop: "24px" }}>
          Gota a Gota - Sistema de Cobro 2025
        </p>
      </div>
    </div>
  );
}