import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prestamosAPI, pagosAPI } from '../services/api';

const fmt = n => "$ " + Number(n || 0).toLocaleString("es-CO");

export default function PagarCredito() {
  const { prestamoId } = useParams();
  const navigate = useNavigate();
  const [prestamo, setPrestamo] = useState(null);
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cuotaDiaria, setCuotaDiaria] = useState(0);
  const [diasTranscurridos, setDiasTranscurridos] = useState(0);
  const [pagoEsperado, setPagoEsperado] = useState(0);
  const [diasAtraso, setDiasAtraso] = useState(0);

  useEffect(() => {
    console.log('=== PAGAR CREDITO ===');
    console.log('ID del préstamo:', prestamoId);
    
    if (!prestamoId || prestamoId === 'undefined' || prestamoId === 'null' || prestamoId === '') {
      setError('ID de préstamo no válido');
      setLoading(false);
      return;
    }
    
    cargarPrestamo();
  }, [prestamoId]);

  const cargarPrestamo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await prestamosAPI.getById(prestamoId);
      const prestamoData = response.data;
      setPrestamo(prestamoData);
      
      // Calcular cuota diaria
      const cuota = prestamoData.totalAPagar / (prestamoData.numeroCuotas || 30);
      const cuotaRedondeada = Math.round(cuota * 100) / 100;
      setCuotaDiaria(cuotaRedondeada);
      
      // Calcular días transcurridos desde el inicio del préstamo
      const fechaInicio = new Date(prestamoData.fechaInicio);
      const hoy = new Date();
      const diffTime = Math.abs(hoy - fechaInicio);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDiasTranscurridos(diffDays);
      
      // Calcular cuánto debería haberse pagado hasta ahora
      const esperado = cuotaRedondeada * Math.min(diffDays, prestamoData.numeroCuotas);
      setPagoEsperado(Math.round(esperado * 100) / 100);
      
      // Calcular días de atraso
      const pagado = prestamoData.totalPagado || 0;
      const atraso = Math.max(0, Math.ceil((esperado - pagado) / cuotaRedondeada));
      setDiasAtraso(atraso);
      
    } catch (err) {
      console.error('Error cargando préstamo:', err);
      setError(err.response?.data?.error || 'Error al cargar los datos del préstamo');
    } finally {
      setLoading(false);
    }
  };

  // Pagar la cuota diaria
  const pagarCuotaDiaria = () => {
    if (prestamo) {
      setMonto(cuotaDiaria.toString());
    }
  };

  // Pagar el total
  const pagarTotal = () => {
    if (prestamo) {
      const saldoPendiente = prestamo.totalAPagar - (prestamo.totalPagado || 0);
      setMonto(saldoPendiente.toString());
    }
  };

  // Pagar lo esperado hasta la fecha
  const pagarEsperado = () => {
    if (prestamo) {
      const pagado = prestamo.totalPagado || 0;
      const porPagar = Math.max(0, pagoEsperado - pagado);
      setMonto(porPagar.toString());
    }
  };

  const handlePagar = async (e) => {
    e.preventDefault();
    
    if (!prestamo) {
      setError('No hay datos del préstamo');
      return;
    }
    
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    const totalAPagar = prestamo.totalAPagar;
    const totalPagado = prestamo.totalPagado || 0;
    const saldoPendiente = totalAPagar - totalPagado;
    
    if (montoNum > saldoPendiente) {
      setError(`El monto no puede ser mayor al saldo pendiente (${fmt(saldoPendiente)})`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const pagoData = {
        prestamoId: prestamo._id,
        clienteId: prestamo.cliente?._id || prestamo.cliente,
        monto: montoNum,
        fecha: new Date().toISOString(),
        metodo: 'efectivo',
        notas: `Pago de ${fmt(montoNum)} registrado`
      };
      
      console.log('Registrando pago:', pagoData);
      
      const response = await pagosAPI.registrar(pagoData);
      
      console.log('Pago registrado:', response.data);
      
      setSuccess(`Pago de ${fmt(montoNum)} registrado exitosamente`);
      
      setTimeout(() => {
        cargarPrestamo();
        setMonto('');
        setSuccess(null);
      }, 2000);
      
    } catch (err) {
      console.error('Error registrando pago:', err);
      setError(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const handleMontoChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setMonto(value);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>Cargando información del crédito...</div>
      </div>
    );
  }

  if (error && !prestamo) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "20px" }}>
        <div style={{ maxWidth: "500px", margin: "0 auto", background: "#fff", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2>Error</h2>
          <p style={{ color: "#ef4444", marginBottom: "20px" }}>{error}</p>
          <button onClick={() => navigate(-1)} style={{ padding: "12px 24px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer" }}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!prestamo) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "20px" }}>
        <div style={{ maxWidth: "500px", margin: "0 auto", background: "#fff", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2>Préstamo no encontrado</h2>
          <button onClick={() => navigate(-1)} style={{ marginTop: "20px", padding: "12px 24px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer" }}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const cliente = prestamo.cliente || {};
  const totalAPagar = prestamo.totalAPagar;
  const totalPagado = prestamo.totalPagado || 0;
  const saldoPendiente = totalAPagar - totalPagado;
  const porcentajePagado = totalAPagar > 0 ? (totalPagado / totalAPagar * 100).toFixed(2) : 0;
  const porPagarEsperado = Math.max(0, pagoEsperado - totalPagado);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "20px" }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate(-1)} style={{ background: "#fff", border: "none", borderRadius: "10px", width: "40px", height: "40px", fontSize: "18px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", cursor: "pointer" }}>
            ←
          </button>
          <h1 style={{ fontSize: "20px", margin: 0, color: "#1e293b" }}>Registrar Pago</h1>
        </div>

        {/* Info Cliente */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ width: "48px", height: "48px", background: "#d1fae5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>👤</div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "18px", color: "#1e293b" }}>{cliente.nombre || 'Cliente'}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>CC: {cliente.cedula || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Info Préstamo */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px", color: "#1e293b" }}>Detalles del Crédito</h3>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Monto del crédito:</span>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>{fmt(prestamo.capital)}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Interés:</span>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>{prestamo.interes}%</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Plazo:</span>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>{prestamo.numeroCuotas || 30} días</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Cuota diaria:</span>
            <span style={{ fontWeight: "600", color: "#1e40af", fontSize: "16px" }}>{fmt(cuotaDiaria)}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
            <span style={{ color: "#64748b" }}>Días transcurridos:</span>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>{diasTranscurridos} días</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", background: diasAtraso > 0 ? "#fef3c7" : "#f8fafc", padding: "8px", borderRadius: "8px" }}>
            <span style={{ color: "#64748b" }}>Días de atraso:</span>
            <span style={{ fontWeight: "600", color: diasAtraso > 0 ? "#f59e0b" : "#22c55e" }}>
              {diasAtraso > 0 ? `${diasAtraso} días` : 'Al día'}
            </span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Total a pagar:</span>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>{fmt(totalAPagar)}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Total pagado:</span>
            <span style={{ fontWeight: "600", color: "#22c55e" }}>{fmt(totalPagado)}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>Saldo pendiente:</span>
            <span style={{ fontWeight: "700", fontSize: "18px", color: saldoPendiente > 0 ? "#f59e0b" : "#22c55e" }}>
              {fmt(saldoPendiente)}
            </span>
          </div>
          
          <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${porcentajePagado}%`, background: porcentajePagado >= 100 ? "#22c55e" : "#1e40af", borderRadius: "4px" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
            {porcentajePagado}% pagado
          </div>
        </div>

        {/* Formulario de Pago */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px", color: "#1e293b" }}>Registrar Nuevo Pago</h3>
          
          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
              ❌ {error}
            </div>
          )}
          
          {success && (
            <div style={{ background: "#d1fae5", color: "#065f46", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
              ✅ {success}
            </div>
          )}
          
          <form onSubmit={handlePagar}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "500" }}>
                Monto a pagar (en pesos colombianos)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>$</span>
                <input
                  type="text"
                  value={monto}
                  onChange={handleMontoChange}
                  placeholder="0"
                  style={{ width: "100%", padding: "12px 12px 12px 28px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "16px" }}
                  required
                />
              </div>
              
              {/* Botones de opciones de pago */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={pagarCuotaDiaria}
                  style={{
                    background: "#1e40af",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  💰 Cuota Día ({fmt(cuotaDiaria)})
                </button>
                
                {porPagarEsperado > 0 && (
                  <button
                    type="button"
                    onClick={pagarEsperado}
                    style={{
                      background: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      flex: 1
                    }}
                  >
                    📅 Pagar al día ({fmt(porPagarEsperado)})
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={pagarTotal}
                  style={{
                    background: "#22c55e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  ✅ Pagar Total ({fmt(saldoPendiente)})
                </button>
              </div>
              
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                💡 Puedes ingresar cualquier monto personalizado
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{ flex: 1, padding: "14px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", color: "#475569", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || saldoPendiente <= 0}
                style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #1e40af, #1e3a8a)", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", color: "#fff", opacity: (saving || saldoPendiente <= 0) ? 0.6 : 1, cursor: "pointer" }}
              >
                {saving ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </form>
          
          {saldoPendiente <= 0 && (
            <div style={{ textAlign: "center", marginTop: "16px", padding: "12px", background: "#d1fae5", borderRadius: "10px", color: "#065f46" }}>
              ✅ Este crédito ya ha sido pagado completamente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}