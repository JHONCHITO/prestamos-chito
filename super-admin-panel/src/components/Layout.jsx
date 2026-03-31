import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function Layout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  const handleLogout = () => {
    localStorage.removeItem("super_token");
    window.location.href = "/login";
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: "/", icon: <DashboardIcon />, label: "Dashboard" },
    { path: "/oficinas", icon: <BusinessIcon />, label: "Oficinas" },
    { path: "/reportes", icon: <AssessmentIcon />, label: "Reportes" },
    { path: "/configuracion", icon: <SettingsIcon />, label: "Configuración" }
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? "80px" : "280px",
        background: "linear-gradient(180deg, rgba(10,10,31,0.95) 0%, rgba(26,26,58,0.98) 100%)",
        backdropFilter: "blur(10px)",
        color: "white",
        padding: collapsed ? "20px 10px" : "30px 20px",
        transition: "all 0.3s ease",
        borderRight: "2px solid rgba(108,60,240,0.3)"
      }}>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute",
            right: "10px",
            top: "20px",
            background: "rgba(108,60,240,0.2)",
            border: "1px solid rgba(108,60,240,0.5)",
            color: "white",
            cursor: "pointer",
            borderRadius: "50%",
            width: "30px",
            height: "30px"
          }}
        >
          <MenuIcon style={{ fontSize: "18px" }} />
        </button>

        <div style={{ textAlign: collapsed ? "center" : "left", marginBottom: "40px", marginTop: "20px" }}>
          <h2 style={{
            fontSize: collapsed ? "20px" : "28px",
            background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            {collapsed ? "🚀" : "SUPER ADMIN"}
          </h2>
          {!collapsed && (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
              CONTROL GALÁCTICO
            </p>
          )}
        </div>

        <div style={{ marginTop: "30px" }}>
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed ? "0" : "15px",
                padding: collapsed ? "15px 0" : "12px 20px",
                marginBottom: "10px",
                borderRadius: "10px",
                textDecoration: "none",
                color: isActive(item.path) ? "white" : "rgba(255,255,255,0.7)",
                background: isActive(item.path) 
                  ? "linear-gradient(90deg, rgba(108,60,240,0.3), rgba(255,60,214,0.2))"
                  : "transparent",
                justifyContent: collapsed ? "center" : "flex-start"
              }}
            >
              <span style={{ fontSize: "24px" }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            bottom: "30px",
            left: collapsed ? "50%" : "20px",
            transform: collapsed ? "translateX(-50%)" : "none",
            padding: collapsed ? "15px" : "10px 20px",
            background: "rgba(255,60,214,0.1)",
            border: "1px solid rgba(255,60,214,0.3)",
            borderRadius: "10px",
            color: "white",
            cursor: "pointer",
            width: collapsed ? "50px" : "calc(100% - 40px)"
          }}
        >
          <LogoutIcon style={{ fontSize: "20px" }} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Contenido principal */}
      <div style={{
        flex: 1,
        padding: "30px",
        background: "radial-gradient(ellipse at top, #0a0a1f, #050510)",
        overflow: "auto"
      }}>
        <div style={{
          background: "rgba(10,10,31,0.6)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "30px",
          minHeight: "calc(100vh - 60px)"
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}