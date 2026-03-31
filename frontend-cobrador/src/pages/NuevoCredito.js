import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientesAPI, prestamosAPI } from '../services/api';

const fmt = n => `$ ${Number(n || 0).toLocaleString('es-CO')}`;

const s = {
  page: { minHeight: '100vh', background: '#f1f5f9' },
  header: { background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0' },
  backBtn: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  content: { padding: '20px' },
  clienteCard: { background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  avatar: { width: '44px', height: '44px', background: '#e0f2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  form: { background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  formTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', marginBottom: '16px', outline: 'none' },
  select: { width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', marginBottom: '16px', background: '#fff', outline: 'none' },
  summary: { background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  summaryTitle: { fontSize: '14px', fontWeight: '700', color: '#065f46', marginBottom: '10px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#374151', marginBottom: '6px' },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#0d9488', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #bbf7d0' },
  saveBtn: { width: '100%', padding: '15px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
};

export default function NuevoCredito() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState({ capital: '', interes: 20, numeroCuotas: 30, frecuencia: 'diario' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientesAPI.getById(clienteId).then(r => setCliente(r.data)).catch(console.error);
  }, [clienteId]);

  const capital = parseFloat(form.capital) || 0;
  const totalAPagar = Math.round(capital * (1 + form.interes / 100));
  const cuotaValor = form.numeroCuotas > 0 ? Math.round(totalAPagar / form.numeroCuotas) : 0;

  const handleSave = async () => {
    if (!capital) return alert('Ingrese el capital del crédito');
    setSaving(true);
    try {
      await prestamosAPI.create({ clienteId, capital, interes: form.interes, numeroCuotas: form.numeroCuotas, frecuencia: form.frecuencia });
      navigate(`/clientes/${clienteId}`);
    } catch (e) { alert(e.response?.data?.error || 'Error al crear crédito'); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <span style={s.headerTitle}>Nuevo Crédito</span>
      </div>
      <div style={s.content}>
        {cliente && (
          <div style={s.clienteCard}>
            <div style={s.avatar}>👤</div>
            <div>
              <div style={{ fontWeight: '700', color: '#1e293b' }}>{cliente.nombre}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>CC: {cliente.cedula}</div>
            </div>
          </div>
        )}
        <div style={s.form}>
          <div style={s.formTitle}>Datos del Crédito</div>
          <label style={s.label}>Capital ($)</label>
          <input style={s.input} type="number" placeholder="Ej: 500000" value={form.capital} onChange={e => setForm({...form, capital: e.target.value})} />
          <label style={s.label}>Interés (%)</label>
          <input style={s.input} type="number" placeholder="20" value={form.interes} onChange={e => setForm({...form, interes: parseFloat(e.target.value) || 0})} />
          <label style={s.label}>Número de Cuotas</label>
          <input style={s.input} type="number" placeholder="30" value={form.numeroCuotas} onChange={e => setForm({...form, numeroCuotas: parseInt(e.target.value) || 1})} />
          <label style={s.label}>Frecuencia de Pago</label>
          <select style={s.select} value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})}>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>

          {capital > 0 && (
            <div style={s.summary}>
              <div style={s.summaryTitle}>Resumen del Crédito</div>
              <div style={s.summaryRow}><span>Capital:</span><span>{fmt(capital)}</span></div>
              <div style={s.summaryRow}><span>Interés ({form.interes}%):</span><span>{fmt(totalAPagar - capital)}</span></div>
              <div style={s.summaryRow}><span>Cuotas:</span><span>{form.numeroCuotas} {form.frecuencia}s</span></div>
              <div style={s.summaryRow}><span>Valor por cuota:</span><span>{fmt(cuotaValor)}</span></div>
              <div style={s.summaryTotal}><span>Total a pagar:</span><span>{fmt(totalAPagar)}</span></div>
            </div>
          )}

          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Creando...' : '✓ Crear Crédito'}
          </button>
        </div>
      </div>
    </div>
  );
}
