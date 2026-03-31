import React, { useState } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];

const s = {
  page: { padding: '28px 32px' },
  pageTitle: { fontSize: '24px', fontWeight: '800', color: '#1e293b' },
  pageSub: { fontSize: '14px', color: '#64748b', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
  card: { background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  monthTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  navBtn: { background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  grid7: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  dayHeader: { textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#64748b', padding: '8px 0' },
  dayCell: { textAlign: 'center', padding: '12px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151', position: 'relative' },
  dayCellActive: { border: '2px solid #16a34a', color: '#16a34a', fontWeight: '700' },
  dayCellSelected: { background: '#16a34a', color: '#fff', fontWeight: '700' },
  dayDot: { width: '5px', height: '5px', background: '#16a34a', borderRadius: '50%', margin: '2px auto 0' },
  sideCard: { background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  sideTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' },
  noEvents: { color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px 0' },
};

export default function Calendario() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const selectedDate = new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={s.page}>
      <div style={s.pageTitle}>Calendario</div>
      <div style={s.pageSub}>Programa y gestiona visitas de cobro</div>
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.calHeader}>
            <div style={s.monthTitle}>{MESES[currentMonth]} {currentYear}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={s.navBtn} onClick={prevMonth}>‹</button>
              <button style={s.navBtn} onClick={nextMonth}>›</button>
            </div>
          </div>
          <div style={s.grid7}>
            {DIAS.map(d => <div key={d} style={s.dayHeader}>{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const today_ = isToday(d);
              const selected = d === selectedDay;
              return (
                <div
                  key={d}
                  style={{
                    ...s.dayCell,
                    ...(selected ? s.dayCellSelected : today_ ? s.dayCellActive : {})
                  }}
                  onClick={() => setSelectedDay(d)}
                >
                  {d}
                  {today_ && !selected && <div style={s.dayDot} />}
                </div>
              );
            })}
          </div>
        </div>
        <div style={s.sideCard}>
          <div style={s.sideTitle}>{selectedDate}</div>
          <div style={s.noEvents}>No hay eventos para este dia</div>
        </div>
      </div>
    </div>
  );
}
