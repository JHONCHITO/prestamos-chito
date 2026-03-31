import { useEffect, useState } from "react";
import api from "../api/api";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExtensionIcon from '@mui/icons-material/Extension';

export default function Oficinas() {
  const [oficinas, setOficinas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [nuevasCredenciales, setNuevasCredenciales] = useState(null);
  const [error, setError] = useState(null);

  const cargarOficinas = async () => {
    try {
      setCargando(true);
      setError(null);
      console.log('Cargando oficinas...');
      const res = await api.get("/superadmin/oficinas");
      console.log('Oficinas cargadas:', res.data);
      setOficinas(res.data);
    } catch (error) {
      console.error("Error cargando oficinas:", error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOficinas();
  }, []);

  const crear = async () => {
    if (!nombre.trim()) {
      alert("Por favor ingresa un nombre para la oficina");
      return;
    }

    setLoading(true);
    try {
      console.log('Creando oficina:', { nombre, direccion, telefono });
      const res = await api.post("/superadmin/crear-oficina", {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim()
      });

      console.log('Oficina creada:', res.data);

      setNuevasCredenciales({
        admin: res.data.admin,
        cobrador: res.data.cobrador,
        tenant: res.data.tenant
      });

      setNombre("");
      setDireccion("");
      setTelefono("");
      await cargarOficinas();
    } catch (error) {
      console.error("Error creando oficina:", error);
      alert("Error creando oficina: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar esta oficina? Esta acción eliminará TODOS los datos asociados (clientes, préstamos, cobradores).")) return;

    try {
      await api.delete("/superadmin/oficinas/" + id);
      await cargarOficinas();
    } catch (error) {
      console.error("Error eliminando oficina:", error);
      alert("Error eliminando oficina: " + (error.response?.data?.error || error.message));
    }
  };

  const toggleEstado = async (id) => {
    try {
      await api.put("/superadmin/oficinas/" + id);
      await cargarOficinas();
    } catch (error) {
      console.error("Error cambiando estado:", error);
      alert("Error cambiando estado: " + (error.response?.data?.error || error.message));
    }
  };

  if (cargando) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
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
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h2 style={{ color: "#ff3cd6" }}>Error al cargar oficinas</h2>
        <p style={{ color: "#fff" }}>{error}</p>
        <button 
          onClick={cargarOficinas}
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
    <div>
      <h1 style={{
        fontSize: "32px",
        marginBottom: "30px",
        background: "linear-gradient(135deg, #fff, #b8b8d4)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        🏢 Gestión de Oficinas
      </h1>

      {/* Formulario de creación */}
      <div style={{
        background: "rgba(26,26,58,0.6)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "25px",
        marginBottom: "30px",
        border: "1px solid rgba(108,60,240,0.3)"
      }}>
        <h3 style={{ color: "#b8b8d4", marginBottom: "20px" }}>
          Crear Nueva Oficina
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            placeholder="Nombre de la oficina *"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 15px",
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(108,60,240,0.3)",
              borderRadius: "10px",
              color: "white",
              fontSize: "16px",
              outline: "none"
            }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="Dirección"
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              style={{
                flex: 1,
                padding: "12px 15px",
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(108,60,240,0.3)",
                borderRadius: "10px",
                color: "white",
                fontSize: "16px",
                outline: "none"
              }}
            />
            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              style={{
                flex: 1,
                padding: "12px 15px",
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(108,60,240,0.3)",
                borderRadius: "10px",
                color: "white",
                fontSize: "16px",
                outline: "none"
              }}
            />
          </div>
          <button
            onClick={crear}
            disabled={loading}
            style={{
              padding: "12px 25px",
              background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <AddIcon />
            {loading ? "Creando..." : "Crear Oficina"}
          </button>
        </div>
      </div>

      {/* Lista de oficinas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
        gap: "20px"
      }}>
        {oficinas.length === 0 ? (
          <p style={{ color: "#b8b8d4", textAlign: "center", gridColumn: "1/-1", padding: "40px" }}>
            No hay oficinas creadas. ¡Crea la primera!
          </p>
        ) : (
          oficinas.map(o => (
            <div
              key={o._id}
              style={{
                background: "rgba(26,26,58,0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "15px",
                padding: "20px",
                border: `1px solid ${o.estado ? '#6c3cf0' : '#ff3cd6'}40`,
                boxShadow: `0 0 20px ${o.estado ? '#6c3cf0' : '#ff3cd6'}20`,
                transition: "all 0.3s",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: "100px",
                height: "100px",
                background: `radial-gradient(circle, ${o.estado ? '#6c3cf0' : '#ff3cd6'}20, transparent)`,
                borderRadius: "50%"
              }} />

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "15px"
              }}>
                <div>
                  <h3 style={{ fontSize: "20px", marginBottom: "5px", color: "#fff" }}>
                    {o.nombre}
                  </h3>
                  <p style={{
                    fontSize: "11px",
                    color: "#b8b8d4",
                    background: "rgba(108,60,240,0.1)",
                    padding: "3px 10px",
                    borderRadius: "15px",
                    display: "inline-block"
                  }}>
                    ID: {o.tenantId || o._id?.slice(-6)}
                  </p>
                </div>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  background: o.estado 
                    ? "rgba(76, 175, 80, 0.2)" 
                    : "rgba(244, 67, 54, 0.2)",
                  color: o.estado ? "#4caf50" : "#f44336",
                  border: `1px solid ${o.estado ? '#4caf50' : '#f44336'}`
                }}>
                  {o.estado ? "ACTIVA" : "INACTIVA"}
                </span>
              </div>

              {(o.direccion || o.telefono) && (
                <div style={{
                  marginBottom: "15px",
                  padding: "10px",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "10px"
                }}>
                  {o.direccion && (
                    <p style={{ fontSize: "12px", color: "#b8b8d4", marginBottom: "5px" }}>
                      📍 {o.direccion}
                    </p>
                  )}
                  {o.telefono && (
                    <p style={{ fontSize: "12px", color: "#b8b8d4" }}>
                      📞 {o.telefono}
                    </p>
                  )}
                </div>
              )}

              <div style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: "15px"
              }}>
                <button
                  onClick={() => toggleEstado(o._id)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: o.estado 
                      ? "rgba(244, 67, 54, 0.1)" 
                      : "rgba(76, 175, 80, 0.1)",
                    border: `1px solid ${o.estado ? '#f44336' : '#4caf50'}`,
                    borderRadius: "8px",
                    color: o.estado ? "#f44336" : "#4caf50",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px"
                  }}
                >
                  {o.estado ? <PauseIcon style={{ fontSize: "16px" }} /> : <PlayArrowIcon style={{ fontSize: "16px" }} />}
                  {o.estado ? "DESACTIVAR" : "ACTIVAR"}
                </button>
                <button
                  onClick={() => eliminar(o._id)}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(244, 67, 54, 0.1)",
                    border: "1px solid #f44336",
                    borderRadius: "8px",
                    color: "#f44336",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Eliminar"
                >
                  <DeleteIcon style={{ fontSize: "16px" }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de credenciales */}
      {nuevasCredenciales && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1a1a3a, #0a0a1f)",
            padding: "40px",
            borderRadius: "30px",
            border: "2px solid #6c3cf0",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h2 style={{ fontSize: "28px", marginBottom: "20px", color: "#fff" }}>
              🎉 ¡Oficina Creada!
            </h2>
            <p style={{ color: "#b8b8d4", marginBottom: "20px" }}>
              Guarda estas credenciales. No podrás volver a verlas.
            </p>

            <div style={{
              background: "rgba(0,0,0,0.3)",
              padding: "20px",
              borderRadius: "15px",
              marginBottom: "20px"
            }}>
              <h3 style={{ color: "#6c3cf0", marginBottom: "10px" }}>
                👤 Administrador
              </h3>
              <p style={{ marginBottom: "5px", color: "#fff" }}>
                <strong>Email:</strong> {nuevasCredenciales.admin.email}
              </p>
              <p style={{ marginBottom: "15px", color: "#fff" }}>
                <strong>Password:</strong> {nuevasCredenciales.admin.password}
              </p>

              <h3 style={{ color: "#ff3cd6", marginBottom: "10px" }}>
                👥 Cobrador
              </h3>
              <p style={{ marginBottom: "5px", color: "#fff" }}>
                <strong>Email:</strong> {nuevasCredenciales.cobrador.email}
              </p>
              <p style={{ marginBottom: "5px", color: "#fff" }}>
                <strong>Password:</strong> {nuevasCredenciales.cobrador.password}
              </p>
              <p style={{ fontSize: "11px", color: "#b8b8d4", marginTop: "10px" }}>
                <strong>ID Oficina:</strong> {nuevasCredenciales.tenant?.tenantId}
              </p>
            </div>

            <button
              onClick={() => setNuevasCredenciales(null)}
              style={{
                width: "100%",
                padding: "15px",
                background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}