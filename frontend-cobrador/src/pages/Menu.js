import React from "react";
import { useNavigate } from "react-router-dom";

export default function Menu({ user, onLogout }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos dias" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  const menuItems = [
    { icon: "👥", label: "Clientes", sub: "Ver y gestionar tus clientes", path: "/clientes", bg: "#3b82f6" },
    { icon: "💳", label: "Creditos", sub: "Ver todos los creditos activos", path: "/creditos", bg: "#f59e0b" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #1e40af, #1e3a8a)", padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", background: "rgba(255,255,255,0.2)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🏦</div>
            <div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>Gota a Gota</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{greeting}, {user.nombre.split(" ")[0]}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "10px", padding: "8px 14px", color: "#fff", fontSize: "13px", fontWeight: "600" }}>
            Salir
          </button>
        </div>
        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>CC: {user.cedula}</div>
          {user.zona && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{user.zona}</div>}
        </div>
      </div>

      <div style={{ padding: "20px", flex: 1 }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>
          Menu Principal
        </div>
        {menuItems.map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{ background: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "17px", fontWeight: "700", color: "#1e293b" }}>{item.label}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{item.sub}</div>
            </div>
            <div style={{ fontSize: "20px", color: "#cbd5e1" }}>›</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{user.email}</div>
      </div>
    </div>
  );
}
