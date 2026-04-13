import React from "react";
import { useNavigate } from "react-router-dom";

export default function Menu({ user, onLogout }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos dias" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = user?.nombre?.split(" ")[0] || "Cobrador";
  const cedula = user?.cedula || "Sin cedula";

  const menuItems = [
    {
      label: "Clientes",
      sub: "Ver y gestionar tus clientes",
      path: "/clientes",
      accent: "#1d4ed8",
      soft: "#dbeafe",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 19C16 16.7909 14.2091 15 12 15H8C5.79086 15 4 16.7909 4 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M17 11C18.6569 11 20 9.65685 20 8C20 6.34315 18.6569 5 17 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M20 19C20 17.3431 18.6569 16 17 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      label: "Creditos",
      sub: "Ver todos los creditos activos",
      path: "/creditos",
      accent: "#0f766e",
      soft: "#ccfbf1",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M3.5 10H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M7 14H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M13.5 14H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      )
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eef4ff 0%, #f8fafc 42%, #eef2f7 100%)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)", padding: "24px 20px 34px", boxShadow: "0 12px 28px rgba(37,99,235,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "52px", height: "52px", background: "rgba(255,255,255,0.16)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }}>🏦</div>
            <div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>Gota a Gota</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff" }}>{greeting}, {firstName}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "12px", padding: "10px 16px", color: "#fff", fontSize: "14px", fontWeight: "700", boxShadow: "0 8px 20px rgba(15,23,42,0.14)" }}>
            Salir
          </button>
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "999px", padding: "8px 12px", fontSize: "13px", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)" }}>
            CC: {cedula}
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "999px", padding: "8px 12px", fontSize: "13px", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)" }}>
            {user?.email || "Sin correo"}
          </div>
          {user.zona && (
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "999px", padding: "8px 12px", fontSize: "13px", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)" }}>
              Zona: {user.zona}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "20px", flex: 1 }}>
        <div style={{ fontSize: "12px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "16px" }}>
          Menu Principal
        </div>
        {menuItems.map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{ background: "rgba(255,255,255,0.92)", borderRadius: "22px", padding: "22px 20px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 12px 26px rgba(15,23,42,0.06)", cursor: "pointer", border: "1px solid rgba(148,163,184,0.14)" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: item.soft, color: item.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>{item.label}</div>
              <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>{item.sub}</div>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "999px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "20px", fontWeight: "700" }}>›</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{user.email}</div>
      </div>
    </div>
  );
}
