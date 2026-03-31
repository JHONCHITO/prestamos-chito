import { useState } from "react";
import api from "../api/api";
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';

export default function Configuracion() {
  const [config, setConfig] = useState({
    tasaInteresGlobal: 20,
    plazoMaximo: 90,
    montoMaximo: 100000000,
    notificacionesEmail: true,
    copiaSeguridad: "diaria"
  });

  const [saving, setSaving] = useState(false);

  const guardarConfiguracion = async () => {
    setSaving(true);
    try {
      await api.post("/superadmin/configuracion", config);
      alert("Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error guardando configuración:", error);
      alert("Error guardando configuración");
    } finally {
      setSaving(false);
    }
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
        ⚙️ Configuración Global
      </h1>

      <div style={{
        background: "rgba(26,26,58,0.6)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "30px",
        border: "1px solid rgba(108,60,240,0.3)"
      }}>
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ color: "#6c3cf0", marginBottom: "20px" }}>
            <SecurityIcon style={{ fontSize: "20px", marginRight: "10px", verticalAlign: "middle" }} />
            Parámetros Globales
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div>
              <label style={{ color: "#b8b8d4", fontSize: "12px", marginBottom: "5px", display: "block" }}>
                Tasa de Interés Global (%)
              </label>
              <input
                type="number"
                value={config.tasaInteresGlobal}
                onChange={e => setConfig({...config, tasaInteresGlobal: parseFloat(e.target.value)})}
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
                Plazo Máximo (días)
              </label>
              <input
                type="number"
                value={config.plazoMaximo}
                onChange={e => setConfig({...config, plazoMaximo: parseInt(e.target.value)})}
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
                Monto Máximo por Préstamo
              </label>
              <input
                type="number"
                value={config.montoMaximo}
                onChange={e => setConfig({...config, montoMaximo: parseInt(e.target.value)})}
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
                Copia de Seguridad
              </label>
              <select
                value={config.copiaSeguridad}
                onChange={e => setConfig({...config, copiaSeguridad: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(108,60,240,0.3)",
                  borderRadius: "8px",
                  color: "white"
                }}
              >
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ color: "#ff3cd6", marginBottom: "20px" }}>
            Notificaciones
          </h3>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.notificacionesEmail}
              onChange={e => setConfig({...config, notificacionesEmail: e.target.checked})}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <span style={{ color: "#b8b8d4" }}>Recibir notificaciones por email</span>
          </label>
        </div>

        <button
          onClick={guardarConfiguracion}
          disabled={saving}
          style={{
            padding: "12px 30px",
            background: "linear-gradient(135deg, #6c3cf0, #ff3cd6)",
            border: "none",
            borderRadius: "10px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          <SaveIcon />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>
    </div>
  );
}