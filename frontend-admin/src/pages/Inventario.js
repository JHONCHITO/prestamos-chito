import React, { useState, useEffect } from 'react';
import { inventarioAPI, cobradoresAPI } from '../services/api';

// Estilos mejorados con diseño futurista
const s = {
  page: { padding: '28px 32px', background: '#020c0a', minHeight: '100vh' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #e2ffe8 0%, #00ff88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  pageSub: { fontSize: '14px', color: '#5a8a6e', marginTop: '4px' },
  addBtn: { 
    background: 'linear-gradient(135deg, #00ff88, #0d9488)', 
    color: '#020c0a', 
    border: 'none', 
    borderRadius: '12px', 
    padding: '12px 24px', 
    fontWeight: '700', 
    fontSize: '14px', 
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  card: { 
    background: 'rgba(7, 26, 20, 0.8)', 
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0,255,136,0.15)',
    borderRadius: '20px', 
    padding: '24px'
  },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  searchInput: { 
    flex: 1, 
    padding: '12px 18px', 
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,255,136,0.2)', 
    borderRadius: '12px', 
    fontSize: '14px', 
    outline: 'none',
    color: '#e2ffe8'
  },
  select: { 
    padding: '12px 18px', 
    border: '1px solid rgba(0,255,136,0.2)', 
    borderRadius: '12px', 
    fontSize: '14px', 
    background: 'rgba(0,0,0,0.3)',
    color: '#e2ffe8',
    outline: 'none', 
    cursor: 'pointer', 
    minWidth: '180px' 
  },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#00ff88', borderBottom: '1px solid rgba(0,255,136,0.2)', fontFamily: 'monospace' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#e2ffe8', borderBottom: '1px solid rgba(0,255,136,0.08)' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', display: 'inline-block' },
  empty: { textAlign: 'center', padding: '60px', color: '#5a8a6e' },
  editBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginRight: '12px', color: '#00ff88' },
  deleteBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#ef4444' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
  modal: { 
    background: 'linear-gradient(135deg, #071a14, #020c0a)',
    border: '1px solid rgba(0,255,136,0.3)',
    borderRadius: '24px', 
    padding: '32px', 
    width: '100%', 
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: { fontSize: '24px', fontWeight: '700', background: 'linear-gradient(135deg, #e2ffe8, #00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '20px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#00ff88', marginBottom: '6px', fontFamily: 'monospace', letterSpacing: '0.5px' },
  input: { 
    width: '100%', 
    padding: '11px 14px', 
    border: '1px solid rgba(0,255,136,0.3)', 
    borderRadius: '10px', 
    fontSize: '14px', 
    marginBottom: '14px', 
    outline: 'none',
    background: 'rgba(0,0,0,0.3)',
    color: '#e2ffe8'
  },
  modalSelect: { 
    width: '100%', 
    padding: '11px 14px', 
    border: '1px solid rgba(0,255,136,0.3)', 
    borderRadius: '10px', 
    fontSize: '14px', 
    marginBottom: '14px', 
    background: 'rgba(0,0,0,0.3)',
    color: '#e2ffe8',
    outline: 'none',
    cursor: 'pointer'
  },
  modalBtns: { display: 'flex', gap: '12px', marginTop: '20px' },
  cancelBtn: { 
    flex: 1, 
    padding: '12px', 
    border: '1px solid rgba(0,255,136,0.3)', 
    borderRadius: '12px', 
    background: 'transparent', 
    fontSize: '14px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    color: '#5a8a6e' 
  },
  saveBtn: { 
    flex: 1, 
    padding: '12px', 
    border: 'none', 
    borderRadius: '12px', 
    background: 'linear-gradient(135deg, #00ff88, #0d9488)', 
    fontSize: '14px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    color: '#020c0a' 
  },
  statsRow: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
    gap: '16px', 
    marginBottom: '24px' 
  },
  statCard: {
    background: 'rgba(7, 26, 20, 0.6)',
    border: '1px solid rgba(0,255,136,0.15)',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center'
  },
  statValue: { fontSize: '28px', fontWeight: '800', color: '#00ff88' },
  statLabel: { fontSize: '11px', color: '#5a8a6e', marginTop: '4px', fontFamily: 'monospace' }
};

const estadoColors = {
  disponible: { background: 'rgba(0,255,136,0.15)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)' },
  asignado: { background: 'rgba(255,204,0,0.15)', color: '#ffcc00', border: '1px solid rgba(255,204,0,0.3)' },
  mantenimiento: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
};

const emptyForm = { tipo: '', descripcion: '', serie: '', cobrador: '', estado: 'disponible', marca: '', modelo: '', valor: '', notas: '' };

export default function Inventario() {
  const [items, setItems] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [search, setSearch] = useState('');
  const [cobradorFilter, setCobradorFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchItems = async () => {
    try {
      const params = { search };
      if (cobradorFilter) params.cobrador = cobradorFilter;
      if (estadoFilter) params.estado = estadoFilter;
      const res = await inventarioAPI.getAll(params);
      setItems(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await inventarioAPI.getStats();
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    cobradoresAPI.getAll().then(r => setCobradores(r.data)).catch(console.error);
    fetchStats();
  }, []);

  useEffect(() => { fetchItems(); }, [search, cobradorFilter, estadoFilter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      tipo: item.tipo,
      descripcion: item.descripcion,
      serie: item.serie || '',
      cobrador: item.cobrador?._id || '',
      estado: item.estado,
      marca: item.marca || '',
      modelo: item.modelo || '',
      valor: item.valor || '',
      notas: item.notas || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.tipo || !form.descripcion) return alert('Complete los campos requeridos');
    setSaving(true);
    try {
      const data = { 
        tipo: form.tipo,
        descripcion: form.descripcion,
        serie: form.serie,
        cobrador: form.cobrador || null,
        estado: form.estado,
        marca: form.marca,
        modelo: form.modelo,
        valor: parseFloat(form.valor) || 0,
        notas: form.notas
      };
      if (editing) await inventarioAPI.update(editing._id, data);
      else await inventarioAPI.create(data);
      setShowModal(false);
      fetchItems();
      fetchStats();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este item del inventario?')) return;
    try { 
      await inventarioAPI.delete(id); 
      fetchItems();
      fetchStats();
    } catch (e) { alert('Error'); }
  };

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Inventario</div>
          <div style={s.pageSub}>Gestiona los recursos asignados a cobradores</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}>+ Nuevo Item</button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.total || 0}</div>
            <div style={s.statLabel}>Total Items</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.disponibles || 0}</div>
            <div style={s.statLabel}>Disponibles</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.asignados || 0}</div>
            <div style={s.statLabel}>Asignados</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.mantenimiento || 0}</div>
            <div style={s.statLabel}>Mantenimiento</div>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.filterRow}>
          <input style={s.searchInput} placeholder="🔍 Buscar en inventario (tipo, serie, descripción)..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.select} value={cobradorFilter} onChange={e => setCobradorFilter(e.target.value)}>
            <option value="">Todos los cobradores</option>
            {cobradores.map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
          <select style={s.select} value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="asignado">Asignado</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Tipo', 'Descripción', 'Serie', 'Cobrador', 'Marca/Modelo', 'Asignación', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={s.empty}>📦 No hay items en el inventario</td>
                </tr>
              ) : items.map(item => (
                <tr key={item._id}>
                  <td style={{ ...s.td, fontWeight: '600', color: '#00ff88' }}>{item.tipo}</td>
                  <td style={s.td}>{item.descripcion}</td>
                  <td style={s.td}>{item.serie || '-'}</td>
                  <td style={s.td}>
                    {item.cobrador ? (
                      <span style={{ color: '#00ff88' }}>{item.cobrador.nombre}</span>
                    ) : '-'}
                  </td>
                  <td style={s.td}>
                    {item.marca && item.modelo ? `${item.marca} ${item.modelo}` : (item.marca || item.modelo || '-')}
                    {item.valor > 0 && <span style={{ fontSize: '11px', color: '#5a8a6e', display: 'block' }}>${item.valor.toLocaleString()}</span>}
                  </td>
                  <td style={s.td}>{item.fechaAsignacion ? new Date(item.fechaAsignacion).toLocaleDateString('es-CO') : '-'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(estadoColors[item.estado] || estadoColors.disponible) }}>
                      {item.estado === 'disponible' ? '📦 Disponible' : item.estado === 'asignado' ? '👤 Asignado' : '🔧 Mantenimiento'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.editBtn} onClick={() => openEdit(item)} title="Editar">✏️</button>
                    <button style={s.deleteBtn} onClick={() => handleDelete(item._id)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de crear/editar */}
      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>{editing ? '✏️ Editar Item' : '➕ Nuevo Item'}</div>
            
            <label style={s.label}>📌 TIPO *</label>
            <input style={s.input} placeholder="Ej: Moto, Tablet, Teléfono, Computador" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} />
            
            <label style={s.label}>📝 DESCRIPCIÓN *</label>
            <input style={s.input} placeholder="Descripción detallada del item" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={s.label}>🔢 MARCA</label>
                <input style={s.input} placeholder="Marca" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>📱 MODELO</label>
                <input style={s.input} placeholder="Modelo" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={s.label}>🔢 SERIE / PLACA</label>
                <input style={s.input} placeholder="Número de serie o placa" value={form.serie} onChange={e => setForm({...form, serie: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>💰 VALOR</label>
                <input style={s.input} type="number" placeholder="Valor del item" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
              </div>
            </div>
            
            <label style={s.label}>👥 ASIGNAR A COBRADOR</label>
            <select style={s.modalSelect} value={form.cobrador} onChange={e => setForm({...form, cobrador: e.target.value})}>
              <option value="">📦 Sin asignar (Disponible)</option>
              {cobradores.map(c => <option key={c._id} value={c._id}>👤 {c.nombre} - {c.cedula}</option>)}
            </select>
            
            <label style={s.label}>⚙️ ESTADO</label>
            <select style={s.modalSelect} value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
              <option value="disponible">📦 Disponible</option>
              <option value="asignado">👤 Asignado</option>
              <option value="mantenimiento">🔧 En Mantenimiento</option>
            </select>
            
            <label style={s.label}>📝 NOTAS</label>
            <input style={s.input} placeholder="Notas adicionales" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} />
            
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}