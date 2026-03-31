import { useEffect, useState } from "react";
import api from "../api/api";

export default function DashboardNuevo() {
  const [stats, setStats] = useState(null);
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        console.log("Cargando datos...");
        const [statsRes, ofiRes] = await Promise.all([
          api.get("/superadmin/stats"),
          api.get("/superadmin/oficinas")
        ]);
        console.log("Stats:", statsRes.data);
        console.log("Oficinas:", ofiRes.data);
        setStats(statsRes.data);
        setOficinas(ofiRes.data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  if (loading) {
    return <div style={{ color: "#00ff88", padding: "40px", textAlign: "center" }}>Cargando datos...</div>;
  }

  return (
    <div>
      <h1 style={{ color: "#00ff88", marginBottom: "30px" }}>Dashboard Galáctico</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "rgba(108,60,240,0.2)", padding: "20px", borderRadius: "15px", textAlign: "center" }}>
          <h3 style={{ color: "#b8b8d4" }}>Oficinas</h3>
          <p style={{ fontSize: "36px", color: "#6c3cf0", fontWeight: "bold" }}>{stats?.oficinas || 0}</p>
        </div>
        <div style={{ background: "rgba(255,60,214,0.2)", padding: "20px", borderRadius: "15px", textAlign: "center" }}>
          <h3 style={{ color: "#b8b8d4" }}>Clientes</h3>
          <p style={{ fontSize: "36px", color: "#ff3cd6", fontWeight: "bold" }}>{stats?.clientes || 0}</p>
        </div>
        <div style={{ background: "rgba(255,140,60,0.2)", padding: "20px", borderRadius: "15px", textAlign: "center" }}>
          <h3 style={{ color: "#b8b8d4" }}>Cobradores</h3>
          <p style={{ fontSize: "36px", color: "#ff8c3c", fontWeight: "bold" }}>{stats?.cobradores || 0}</p>
        </div>
        <div style={{ background: "rgba(76,175,80,0.2)", padding: "20px", borderRadius: "15px", textAlign: "center" }}>
          <h3 style={{ color: "#b8b8d4" }}>Préstamos</h3>
          <p style={{ fontSize: "36px", color: "#4caf50", fontWeight: "bold" }}>{stats?.prestamos || 0}</p>
        </div>
      </div>

      <h2 style={{ color: "#00ff88", marginBottom: "20px" }}>📋 Oficinas Registradas</h2>
      {oficinas.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #6c3cf0" }}>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Tenant ID</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Estado</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Fecha Creación</th>
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