import { useState, useEffect } from "react";
import api from "../api/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function Reportes() {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [oficinaId, setOficinaId] = useState("");
  const [listaOficinas, setListaOficinas] = useState([]); // Cambiar nombre para evitar warning

  const cargarOficinas = async () => {
    try {
      const res = await api.get("/superadmin/oficinas");
      setListaOficinas(res.data);
    } catch (error) {
      console.error("Error cargando oficinas:", error);
    }
  };

  useEffect(() => {
    cargarOficinas();
  }, []);

  const generarReporte = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/reportes", {
        params: { fechaInicio, fechaFin, oficinaId }
      });
      setReporte(res.data);
    } catch (error) {
      console.error("Error generando reporte:", error);
      alert("Error generando reporte");
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!reporte) return;
    alert("Funcionalidad de exportación en desarrollo");
  };

  return (
    <div>
      <h1 style={{
        fontSize: "32px",
        marginBottom: "30px",
        background: "linear-gradient(135deg, #fff, #b8b8d4)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        📊 Reportes Globales
      </h1>

      {/* Filtros */}
      <div style={{
        background: "rgba(26,26,58,0.6)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "25px",
        marginBottom: "30px",
        border: "1px solid rgba(108,60,240,0.3)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
          <div>
            <label style={{ color: "#b8b8d4", fontSize: "12px", marginBottom: "5px", display: "block" }}>
              <CalendarTodayIcon style={{ fontSize: "14px", marginRight: "5px", verticalAlign: "middle" }} />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(108,60,240,0.3)",
                borderRadius: "8px",
                color: "white"
              }}
            />
          </div>
          <div>
            <label style={{ color: "#b8b8d4", fontSize: "12px", marginBottom: "5px", display: "block" }}>
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(108,60,240,0.3)",
                borderRadius: "8px",
                color: "white"
              }}
            />
          </div>
          <div>
            <label style={{ color: "#b8b8d4", fontSize: "12px", marginBottom: "5px", display: "block" }}>
              Oficina
            </label>
            <select
              value={oficinaId}
              onChange={e => setOficinaId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(108,60,240,0.3)",
                borderRadius: "8px",
                color: "white"
              }}
            >
              <option value="">Todas las oficinas</option>
              {listaOficinas.map(o => (
                <option key={o._id} value={o._id}>{o.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={generarReporte}
            disabled={loading}
            style={{
              padding: "12px 25px",
              background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading ? "Generando..." : "Generar Reporte"}
          </button>
          {reporte && (
            <button
              onClick={exportarExcel}
              style={{
                padding: "12px 25px",
                background: "rgba(76, 175, 80, 0.2)",
                border: "1px solid #4caf50",
                borderRadius: "10px",
                color: "#4caf50",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <DownloadIcon />
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {reporte && (
        <div>
          {/* Resumen */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}>
            <div style={{
              background: "rgba(26,26,58,0.6)",
              borderRadius: "15px",
              padding: "20px",
              textAlign: "center"
            }}>
              <p style={{ color: "#b8b8d4", fontSize: "12px" }}>Total Préstamos</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", color: "#6c3cf0" }}>{reporte.totalPrestamos || 0}</p>
            </div>
            <div style={{
              background: "rgba(26,26,58,0.6)",
              borderRadius: "15px",
              padding: "20px",
              textAlign: "center"
            }}>
              <p style={{ color: "#b8b8d4", fontSize: "12px" }}>Total Recaudado</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", color: "#ff3cd6" }}>${(reporte.totalRecaudado || 0).toLocaleString()}</p>
            </div>
            <div style={{
              background: "rgba(26,26,58,0.6)",
              borderRadius: "15px",
              padding: "20px",
              textAlign: "center"
            }}>
              <p style={{ color: "#b8b8d4", fontSize: "12px" }}>Clientes Activos</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", color: "#4caf50" }}>{reporte.clientesActivos || 0}</p>
            </div>
          </div>

          {/* Gráfica */}
          {reporte.datosGrafica && (
            <div style={{
              background: "rgba(26,26,58,0.6)",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid rgba(108,60,240,0.3)"
            }}>
              <h3 style={{ color: "#b8b8d4", marginBottom: "20px" }}>
                Evolución de Préstamos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reporte.datosGrafica}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="fecha" stroke="#b8b8d4" />
                  <YAxis stroke="#b8b8d4" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="prestamos" stroke="#6c3cf0" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}