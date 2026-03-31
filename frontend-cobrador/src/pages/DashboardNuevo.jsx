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
    return <div style={{ color: "#00ff88", padding: "40px" }}>Cargando datos...</div>;
  }

  return (
    <div>
      <h1 style={{ color: "#00ff88" }}>Dashboard</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "rgba(108,60,240,0.2)", padding: "20px", borderRadius: "10px" }}>
          <h3>Oficinas</h3>
          <p style={{ fontSize: "32px" }}>{stats?.oficinas || 0}</p>
        </div>
        <div style={{ background: "rgba(255,60,214,0.2)", padding: "20px", borderRadius: "10px" }}>
          <h3>Clientes</h3>
          <p style={{ fontSize: "32px" }}>{stats?.clientes || 0}</p>
        </div>
        <div style={{ background: "rgba(255,140,60,0.2)", padding: "20px", borderRadius: "10px" }}>
          <h3>Cobradores</h3>
          <p style={{ fontSize: "32px" }}>{stats?.cobradores || 0}</p>
        </div>
        <div style={{ background: "rgba(76,175,80,0.2)", padding: "20px", borderRadius: "10px" }}>
          <h3>Préstamos</h3>
          <p style={{ fontSize: "32px" }}>{stats?.prestamos || 0}</p>
        </div>
      </div>

      <h2 style={{ color: "#00ff88" }}>Oficinas Registradas</h2>
      {oficinas.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #6c3cf0" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Nombre</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Tenant ID</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Estado</th>
             </tr>
          </thead>
          <tbody>
            {oficinas.map(o => (
              <tr key={o._id} style={{ borderBottom: "1px solid rgba(108,60,240,0.2)" }}>
                <td style={{ padding: "10px" }}>{o.nombre}</td>
                <td style={{ padding: "10px" }}>{o.tenantId}</td>
                <td style={{ padding: "10px" }}>
                  <span style={{ color: o.estado ? "#4caf50" : "#f44336" }}>
                    {o.estado ? "ACTIVA" : "INACTIVA"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay oficinas</p>
      )}
    </div>
  );
}