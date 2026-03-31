// src/pages/Cartera.jsx
import React, { useState, useEffect } from 'react';
import { carteraAPI } from '../services/cartera';
import { formatMoney } from '../utils/formatters';

export default function Cartera() {
  const [resumen, setResumen] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resResumen, resPrestamos] = await Promise.all([
        carteraAPI.getResumen(),
        carteraAPI.getPrestamos()
      ]);
      
      setResumen(resResumen.data);
      setPrestamos(resPrestamos.data);
    } catch (error) {
      console.error('Error cargando cartera:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1>Cartera</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Gestiona los préstamos y pagos
      </p>

      {/* Tarjetas de resumen */}
      {resumen && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <Tarjeta 
            titulo="Cartera Total"
            valor={resumen.resumen.totalAPagar}
            color="#0d9488"
          />
          <Tarjeta 
            titulo="Total Recaudado"
            valor={resumen.pagos.mes.total}
            color="#22c55e"
          />
          <Tarjeta 
            titulo="Por Cobrar"
            valor={resumen.resumen.saldoPendiente}
            color="#ef4444"
          />
          <Tarjeta 
            titulo="Préstamos Activos"
            valor={resumen.resumen.totalPrestamos}
            color="#3b82f6"
          />
        </div>
      )}

      {/* Tabla de préstamos */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            style={{
              padding: '10px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '300px',
              marginRight: '12px'
            }}
          />
          <select style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}>
            <option>Todos los cobradores</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Cobrador</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Capital</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Pagado</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Pendiente</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Progreso</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Estado</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 8px' }}>{p.cliente}</td>
                <td style={{ padding: '12px 8px' }}>{p.cobrador}</td>
                <td style={{ textAlign: 'right', padding: '12px 8px' }}>{formatMoney(p.capital)}</td>
                <td style={{ textAlign: 'right', padding: '12px 8px' }}>{formatMoney(p.totalAPagar)}</td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#22c55e' }}>{formatMoney(p.totalPagado)}</td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#ef4444' }}>{formatMoney(p.pendiente)}</td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    margin: '0 auto',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${p.progreso}%`,
                      height: '100%',
                      background: '#0d9488',
                      borderRadius: '4px'
                    }} />
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <span style={{
                    padding: '4px 8px',
                    background: p.estado === 'activo' ? '#d1fae5' : '#fee2e2',
                    color: p.estado === 'activo' ? '#065f46' : '#991b1b',
                    borderRadius: '20px',
                    fontSize: '12px'
                  }}>
                    {p.estado}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: '#0d9488',
                    cursor: 'pointer'
                  }}>
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor, color }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>{titulo}</p>
      <p style={{ 
        fontSize: '24px', 
        fontWeight: '700', 
        color: color 
      }}>
        {formatMoney(valor)}
      </p>
    </div>
  );
}