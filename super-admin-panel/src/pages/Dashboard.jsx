import { useEffect, useState } from "react";
import api from "../api/api";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oficinasDetalle, setOficinasDetalle] = useState([]);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Cargando estadísticas...");
      const statsRes = await api.get("/superadmin/stats");
      console.log("Stats:", statsRes.data);
      setStats(statsRes.data);
      
      console.log("Cargando oficinas...");
      const oficinasRes = await api.get("/superadmin/oficinas");
      console.log("Oficinas:", oficinasRes.data);
      setOficinasDetalle(oficinasRes.data);
      
    } catch (err) {
      console.error("Error:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "500px" }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid rgba(108,60,240,0.3)",
          borderTop: "3px solid #6c3cf0",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#ff3cd6" }}>
        <h2>Error al cargar datos</h2>
        <p>{error}</p>
        <button onClick={cargarDatos} style={{ padding: "10px 20px", background: "#6c3cf0", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>
          Reintentar
        </button>
      </div>
    );
  }

  const monthlyData = [
    { name: 'Ene', prestamos: 65, clientes: 78, ingresos: 12500000 },
    { name: 'Feb', prestamos: 59, clientes: 82, ingresos: 11800000 },
    { name: 'Mar', prestamos: 80, clientes: 91, ingresos: 16200000 },
    { name: 'Abr', prestamos: 81, clientes: 94, ingresos: 16800000 },
    { name: 'May', prestamos: 56, clientes: 88, ingresos: 11200000 },
    { name: 'Jun', prestamos: 55, clientes: 85, ingresos: 11000000 },
  ];

  const pieData = [
    { name: 'Activos', value: stats?.prestamosActivos || 45 },
    { name: 'Pagados', value: stats?.prestamosPagados || 30 },
    { name: 'Vencidos', value: stats?.prestamosVencidos || 25 },
  ];

  const COLORS = ['#6c3cf0', '#ff3cd6', '#ff8c3c'];

  const cards = [
    { icon: <BusinessIcon style={{ fontSize: "40px" }} />, title: "Oficinas", value: stats?.oficinas || 0, color: "#6c3cf0", trend: "+12%", trendUp: true },
    { icon: <PeopleIcon style={{ fontSize: "40px" }} />, title: "Clientes", value: stats?.clientes || 0, color: "#ff3cd6", trend: "+8%", trendUp: true },
    { icon: <AccountBalanceIcon style={{ fontSize: "40px" }} />, title: "Cobradores", value: stats?.cobradores || 0, color: "#ff8c3c", trend: "+5%", trendUp: true },
    { icon: <AttachMoneyIcon style={{ fontSize: "40px" }} />, title: "Préstamos", value: stats?.prestamos || 0, color: "#4caf50", trend: "-3%", trendUp: false }
  ];

  const oficinasActivas = oficinasDetalle.filter(o => o.estado).length;
  const oficinasInactivas = oficinasDetalle.filter(o => !o.estado).length;

  return (
    <div>
      <h1 style={{ fontSize: "32px", marginBottom: "10px", background: "linear-gradient(135deg, #fff, #b8b8d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Dashboard Galáctico
      </h1>
      <p style={{ color: "#b8b8d4", marginBottom: "30px" }}>Visión general del universo GOTA A GOTA</p>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        {cards.map((card, index) => (
          <div key={index} style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "25px", border: `1px solid ${card.color}40`, boxShadow: `0 0 30px ${card.color}20`, transition: "transform 0.3s", cursor: "pointer", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ position: "absolute", top: -20, right: -20, width: "100px", height: "100px", background: `radial-gradient(circle, ${card.color}20, transparent)`, borderRadius: "50%" }} />
            <div style={{ color: card.color, marginBottom: "15px" }}>{card.icon}</div>
            <h3 style={{ color: "#b8b8d4", fontSize: "14px", marginBottom: "5px" }}>{card.title}</h3>
            <p style={{ fontSize: "36px", fontWeight: "bold", color: "white" }}>{card.value}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "10px", color: card.trendUp ? "#4caf50" : "#f44336" }}>
              {card.trendUp ? <TrendingUpIcon style={{ fontSize: "16px" }} /> : <TrendingDownIcon style={{ fontSize: "16px" }} />}
              <span style={{ fontSize: "12px" }}>{card.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Estado de Oficinas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "20px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <CheckCircleIcon style={{ color: "#4caf50" }} />
            <h3 style={{ color: "#b8b8d4" }}>Oficinas Activas</h3>
          </div>
          <p style={{ fontSize: "48px", fontWeight: "bold", color: "#4caf50" }}>{oficinasActivas}</p>
        </div>
        <div style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "20px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <WarningIcon style={{ color: "#f44336" }} />
            <h3 style={{ color: "#b8b8d4" }}>Oficinas Inactivas</h3>
          </div>
          <p style={{ fontSize: "48px", fontWeight: "bold", color: "#f44336" }}>{oficinasInactivas}</p>
        </div>
      </div>

      {/* Lista de oficinas */}
      {oficinasDetalle.length > 0 && (
        <div style={{ background: "rgba(26,26,58,0.6)", borderRadius: "20px", padding: "20px", marginBottom: "30px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <h3 style={{ color: "#b8b8d4", marginBottom: "20px" }}>📋 Oficinas Registradas ({oficinasDetalle.length})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(108,60,240,0.3)" }}>
                  <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Nombre</th>
                  <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Tenant ID</th>
                  <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "12px", color: "#b8b8d4" }}>Fecha Creación</th>
                </tr>
              </thead>
              <tbody>
                {oficinasDetalle.map(o => (
                  <tr key={o._id} style={{ borderBottom: "1px solid rgba(108,60,240,0.1)" }}>
                    <td style={{ padding: "12px", color: "#fff" }}>{o.nombre}</td>
                    <td style={{ padding: "12px", color: "#b8b8d4" }}>{o.tenantId}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", background: o.estado ? "rgba(76,175,80,0.2)" : "rgba(244,67,54,0.2)", color: o.estado ? "#4caf50" : "#f44336" }}>
                        {o.estado ? "ACTIVA" : "INACTIVA"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#b8b8d4" }}>{new Date(o.fechaCreacion).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {oficinasDetalle.length === 0 && stats?.oficinas === 0 && (
        <div style={{ background: "rgba(26,26,58,0.6)", borderRadius: "20px", padding: "40px", textAlign: "center", marginBottom: "30px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <p style={{ color: "#b8b8d4", fontSize: "16px" }}>🚀 No hay oficinas creadas aún.</p>
          <p style={{ color: "#5a8a6e", fontSize: "14px", marginTop: "10px" }}>Ve a la sección "Oficinas" y crea tu primera oficina.</p>
        </div>
      )}

      {/* Gráficas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px" }}>
        <div style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "20px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <h3 style={{ marginBottom: "20px", color: "#b8b8d4" }}>📈 Tendencia Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#b8b8d4" />
              <YAxis stroke="#b8b8d4" />
              <Tooltip contentStyle={{ background: "#0a0a1f", border: "1px solid #6c3cf0", borderRadius: "10px" }} />
              <Legend />
              <Line type="monotone" dataKey="prestamos" stroke="#6c3cf0" strokeWidth={3} dot={{ fill: "#6c3cf0" }} />
              <Line type="monotone" dataKey="clientes" stroke="#ff3cd6" strokeWidth={3} dot={{ fill: "#ff3cd6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "20px", border: "1px solid rgba(108,60,240,0.3)" }}>
          <h3 style={{ marginBottom: "20px", color: "#b8b8d4" }}>🥧 Estado de Préstamos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={entry => `${entry.name}: ${entry.value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "rgba(26,26,58,0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "20px", border: "1px solid rgba(108,60,240,0.3)", gridColumn: "span 2" }}>
          <h3 style={{ marginBottom: "20px", color: "#b8b8d4" }}>📊 Ingresos Mensuales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#b8b8d4" />
              <YAxis stroke="#b8b8d4" />
              <Tooltip contentStyle={{ background: "#0a0a1f", border: "1px solid #6c3cf0", borderRadius: "10px" }} formatter={(value) => [`$${value.toLocaleString()}`, "Ingresos"]} />
              <Legend />
              <Area type="monotone" dataKey="ingresos" stroke="#6c3cf0" fill="#6c3cf0" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}