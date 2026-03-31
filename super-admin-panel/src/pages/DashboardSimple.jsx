import { useEffect, useState } from "react";
import api from "../api/api";

export default function DashboardSimple() {
  const [stats, setStats] = useState(null);
  const [oficinas, setOficinas] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 DashboardSimple cargado");
    console.log("🌐 API URL:", api.defaults.baseURL);
    
    const cargarDatos = async () => {
      try {
        console.log("📤 Intentando cargar stats...");
        // Asegúrate que la ruta es correcta
        const statsRes = await api.get("/superadmin/stats");
        console.log("✅ Stats cargados:", statsRes.data);
        setStats(statsRes.data);
        
        console.log("📤 Intentando cargar oficinas...");
        const oficinasRes = await api.get("/superadmin/oficinas");
        console.log("✅ Oficinas cargadas:", oficinasRes.data);
        setOficinas(oficinasRes.data);
        
      } catch (err) {
        console.error("❌ Error completo:", err);
        console.error("❌ URL que falló:", err.config?.url);
        console.error("❌ Response:", err.response);
        setError({
          message: err.response?.data?.error || err.message,
          status: err.response?.status,
          url: err.config?.url,
          data: err.response?.data
        });
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "400px",
        color: "#00ff88"
      }}>
        <div>
          <div style={{ fontSize: "20px", marginBottom: "10px" }}>🔄</div>
          Cargando datos del universo...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        background: "rgba(255,0,0,0.1)",
        borderRadius: "20px",
        margin: "20px"
      }}>
        <h2 style={{ color: "#ff3cd6" }}>⚠️ Error al cargar datos</h2>
        <p style={{ color: "#fff" }}>{error.message}</p>
        <p style={{ color: "#b8b8d4", fontSize: "12px" }}>URL: {error.url}</p>
        <p style={{ color: "#b8b8d4", fontSize: "12px" }}>Status: {error.status}</p>
        {error.data && (
          <pre style={{ 
            color: "#b8b8d4", 
            fontSize: "11px", 
            textAlign: "left",
            background: "rgba(0,0,0,0.3)",
            padding: "10px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "200px"
          }}>
            {JSON.stringify(error.data, null, 2)}
          </pre>
        )}
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer"
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ color: "#00ff88", marginBottom: "20px" }}>📊 Dashboard de Prueba</h1>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: "20px",
        marginBottom: "30px"
      }}>
        <div style={{ 
          background: "rgba(108,60,240,0.2)", 
          padding: "20px", 
          borderRadius: "15px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#b8b8d4" }}>Oficinas</h3>
          <p style={{ fontSize: "36px", color: "#6c3cf0", fontWeight: "bold" }}>{stats?.oficinas || 0}</p>
        </div>
        <div style={{ 
          background: "rgba(255,60,214,0.2)", 
          padding: "20px", 
          borderRadius: "15px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#b8b8d4" }}>Clientes</h3>
          <p style={{ fontSize: "36px", color: "#ff3cd6", fontWeight: "bold" }}>{stats?.clientes || 0}</p>
        </div>
        <div style={{ 
          background: "rgba(255,140,60,0.2)", 
          padding: "20px", 
          borderRadius: "15px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#b8b8d4" }}>Cobradores</h3>
          <p style={{ fontSize: "36px", color: "#ff8c3c", fontWeight: "bold" }}>{stats?.cobradores || 0}</p>
        </div>
        <div style={{ 
          background: "rgba(76,175,80,0.2)", 
          padding: "20px", 
          borderRadius: "15px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#b8b8d4" }}>Préstamos</h3>
          <p style={{ fontSize: "36px", color: "#4caf50", fontWeight: "bold" }}>{stats?.prestamos || 0}</p>
        </div>
      </div>
      
      <h3 style={{ color: "#00ff88", marginBottom: "15px" }}>📋 Oficinas Registradas</h3>
      {oficinas?.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #6c3cf0" }}>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Tenant ID</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Estado</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {oficinas.map(o => (
                <tr key={o._id} style={{ borderBottom: "1px solid rgba(108,60,240,0.2)" }}>
                  <td style={{ padding: "12px", color: "#fff" }}>{o.nombre}</td>
                  <td style={{ padding: "12px", color: "#b8b8d4" }}>{o.tenantId}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      background: o.estado ? "rgba(76,175,80,0.2)" : "rgba(244,67,54,0.2)",
                      color: o.estado ? "#4caf50" : "#f44336"
                    }}>
                      {o.estado ? "ACTIVA" : "INACTIVA"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "#b8b8d4" }}>
                    {new Date(o.fechaCreacion).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: "#b8b8d4", textAlign: "center", padding: "40px" }}>
          No hay oficinas creadas. Ve a la sección "Oficinas" para crear una.
        </p>
      )}
    </div>
  );
}