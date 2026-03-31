import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prestamosAPI } from '../services/api';

const fmt = n => `$ ${Number(n || 0).toLocaleString('es-CO')}`;

const s = {
  page: { minHeight: '100vh', background: '#f1f5f9' },
  header: { background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#1e293b' },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  searchWrap: { padding: '16px 20px' },
  searchContainer: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' },
  searchInput: { width: '100%', padding: '12px 16px 12px 40px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#fff', outline: 'none' },
  list: { padding: '0 20px' },
  card: { background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  avatar: { width: '44px', height: '44px', background: '#e0f2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  cardInfo: { flex: 1 },
  clienteName: { fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  date: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  amount: { fontSize: '18px', fontWeight: '700', color: '#1e293b', textAlign: 'right' },
  badge: { display: 'block', fontSize: '12px', fontWeight: '600', textAlign: 'right', marginTop: '4px', padding: '2px 8px', borderRadius: '10px' },
  progressBar: { height: '6px', background: '#f1f5f9', borderRadius: '4px', margin: '8px 0 6px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px' },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
};

export default function Creditos() {
  const navigate = useNavigate();
  const [prestamos, setPrestamos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prestamosAPI.getAll().then(r => setPrestamos(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = prestamos.filter(p =>
    !search || p.cliente?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/menu')}>←</button>
        <span style={s.headerTitle}>Créditos</span>
      </div>
      <div style={s.searchWrap}>
        <div style={s.searchContainer}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder="Buscar créditos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div style={s.list}>
        {loading ? <div style={s.empty}>Cargando...</div> :
          filtered.length === 0 ? <div style={s.empty}>No hay créditos</div> :
          filtered.map(p => {
            const pct = p.totalAPagar > 0 ? Math.round((p.totalPagado / p.totalAPagar) * 100) : 0;
            const pagado = pct >= 100;
            return (
              <div key={p._id} style={s.card} onClick={() => navigate(`/clientes/${p.cliente?._id}`)}>
                <div style={s.cardTop}>
                  <div style={s.avatar}>💳</div>
                  <div style={s.cardInfo}>
                    <div style={s.clienteName}>{p.cliente?.nombre}</div>
                    <div style={s.date}>{new Date(p.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div style={s.amount}>{fmt(p.capital)}</div>
                    <span style={{ ...s.badge, background: pagado ? '#1e40af' : '#f1f5f9', color: pagado ? '#fff' : '#64748b' }}>{pct.toFixed(1)} %</span>
                  </div>
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${pct}%`, background: pagado ? '#22c55e' : '#1e40af' }} />
                </div>
                <div style={s.meta}>
                  <span>Pagado: {fmt(p.totalPagado)}</span>
                  <span>Restante: {fmt(p.totalAPagar - p.totalPagado)}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
