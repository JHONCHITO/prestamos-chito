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
      accent: "#1e40af",
      soft: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      border: "rgba(30, 64, 175, 0.12)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="9" cy="8" r="3.25" fill="currentColor" opacity="0.18" />
          <circle cx="16.5" cy="9.2" r="2.45" fill="currentColor" opacity="0.12" />
          <path d="M4.75 18.25C4.75 15.6266 6.87665 13.5 9.5 13.5H10.5C13.1234 13.5 15.25 15.6266 15.25 18.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M14.2 14.25C15.0064 13.7839 15.9458 13.517 16.9474 13.517C19.9633 13.517 20.75 15.9335 20.75 18.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="10" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M14.75 9.25C15.1615 10.0288 15.9827 10.5603 16.9281 10.5603C18.287 10.5603 19.3887 9.45856 19.3887 8.09961C19.3887 6.74066 18.287 5.63892 16.9281 5.63892C15.9777 5.63892 15.1531 6.17638 14.7441 6.96215" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      label: "Creditos",
      sub: "Ver todos los creditos activos",
      path: "/creditos",
      accent: "#0f766e",
      soft: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
      border: "rgba(15, 118, 110, 0.12)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="3" stroke="currentColor" strokeWidth="1.8"/>
          <rect x="5.8" y="8.2" width="12.4" height="2.4" rx="1.2" fill="currentColor" opacity="0.14"/>
          <path d="M3.75 10.75H20.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M7 14.6H10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M13.2 14.6H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M17.75 4.25L19.75 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
          <div key={item.path} onClick={() => navigate(item.path)} style={{ background: "rgba(255,255,255,0.96)", borderRadius: "24px", padding: "22px 20px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 14px 30px rgba(15,23,42,0.06)", cursor: "pointer", border: `1px solid ${item.border}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: "5px", background: item.accent, borderRadius: "24px 0 0 24px", opacity: 0.9 }} />
            <div style={{ width: "60px", height: "60px", borderRadius: "20px", background: item.soft, color: item.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 18px rgba(15,23,42,0.05)", flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.01em" }}>{item.label}</div>
              <div style={{ fontSize: "14px", color: "#64748b", marginTop: "5px" }}>{item.sub}</div>
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "999px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: item.accent, fontSize: "18px", fontWeight: "800", flexShrink: 0 }}>›</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{user.email}</div>
      </div>
    </div>
  );
}
