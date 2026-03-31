import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clientesAPI } from "../services/api";

const badgeColors = {
  nuevo:      { background: "#f1f5f9", color: "#475569" },
  recurrente: { background: "#d1fae5", color: "#065f46" },
  moroso:     { background: "#fee2e2", color: "#991b1b" },
};

export default function Clientes({ onLogout }) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre:"", cedula:"", celular:"", direccion:"", tipoCliente:"nuevo" });
  const [saving, setSaving] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try { const res = await clientesAPI.getAll(search); setClientes(res.data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClientes(); }, [search]);

  const handleSave = async () => {
    if (!form.nombre||!form.cedula||!form.celular||!form.direccion) {
      alert("Complete todos los campos requeridos"); return;
    }
    setSaving(true);
    try {
      await clientesAPI.create(form);
      setShowModal(false);
      setForm({ nombre:"", cedula:"", celular:"", direccion:"", tipoCliente:"nuevo" });
      fetchClientes();
    } catch(e) { alert(e.response?.data?.error || "Error al guardar"); }
    finally { setSaving(false); }
  };

  const inputSt = {
    width:"100%", padding:"13px 16px", border:"1.5px solid #e2e8f0",
    borderRadius:"10px", fontSize:"16px", marginBottom:"16px",
    outline:"none", boxSizing:"border-box", background:"#fff", color:"#1e293b"
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"Inter,sans-serif" }}>
      <div style={{ background:"#fff", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <button style={{ background:"none", border:"none", fontSize:"24px", cursor:"pointer", color:"#1e293b", padding:"4px 8px", WebkitTapHighlightColor:"transparent" }} onClick={() => navigate("/menu")}>
          {"←"}
        </button>
        <span style={{ fontSize:"18px", fontWeight:"700", color:"#1e293b" }}>Clientes</span>
        <button style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:"10px", padding:"9px 14px", fontWeight:"700", fontSize:"14px", cursor:"pointer", WebkitTapHighlightColor:"transparent" }} onClick={() => setShowModal(true)}>
          + Agregar
        </button>
      </div>

      <div style={{ padding:"14px 16px" }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", fontSize:"16px" }}>&#128269;</span>
          <input
            style={{ width:"100%", padding:"12px 16px 12px 42px", border:"1.5px solid #e2e8f0", borderRadius:"12px", fontSize:"16px", background:"#fff", outline:"none", boxSizing:"border-box" }}
            placeholder="Buscar por nombre o cedula..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ padding:"0 16px 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8" }}>Cargando...</div>
        ) : clientes.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8" }}>
            <div style={{ fontSize:"40px", marginBottom:"10px" }}>&#128101;</div>
            No hay clientes registrados
          </div>
        ) : clientes.map(c => (
          <div key={c._id}
            style={{ background:"#fff", borderRadius:"14px", padding:"16px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}
            onClick={() => navigate("/clientes/"+c._id)}
          >
            <div style={{ width:"46px", height:"46px", background:"#e0f2fe", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", flexShrink:0 }}>&#128100;</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"16px", fontWeight:"700", color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre}</div>
              <div style={{ fontSize:"13px", color:"#64748b", marginTop:"2px" }}>CC: {c.cedula}</div>
              <div style={{ fontSize:"13px", color:"#64748b" }}>Tel: {c.celular}</div>
            </div>
            <span style={{ ...badgeColors[c.tipoCliente], padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"600", whiteSpace:"nowrap", flexShrink:0 }}>{c.tipoCliente}</span>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }}
          onClick={e => e.target===e.currentTarget && setShowModal(false)}
        >
          <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 16px 32px", width:"100%", maxWidth:"500px", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <span style={{ fontSize:"20px", fontWeight:"700", color:"#1e293b" }}>Agregar Cliente</span>
              <button style={{ background:"none", border:"none", fontSize:"24px", cursor:"pointer", color:"#94a3b8" }} onClick={() => setShowModal(false)}>{"✕"}</button>
            </div>
            <label style={{ display:"block", fontSize:"14px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>Nombre <span style={{ color:"#ef4444" }}>*</span></label>
            <input style={inputSt} type="text" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({...form, nombre:e.target.value})} />
            <label style={{ display:"block", fontSize:"14px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>Cedula <span style={{ color:"#ef4444" }}>*</span></label>
            <input style={inputSt} type="text" placeholder="Numero de cedula" value={form.cedula} onChange={e => setForm({...form, cedula:e.target.value})} />
            <label style={{ display:"block", fontSize:"14px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>Celular <span style={{ color:"#ef4444" }}>*</span></label>
            <input style={inputSt} type="tel" placeholder="Numero de celular" value={form.celular} onChange={e => setForm({...form, celular:e.target.value})} />
            <label style={{ display:"block", fontSize:"14px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>Direccion <span style={{ color:"#ef4444" }}>*</span></label>
            <input style={inputSt} type="text" placeholder="Direccion del cliente" value={form.direccion} onChange={e => setForm({...form, direccion:e.target.value})} />
            <label style={{ display:"block", fontSize:"14px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>Tipo de Cliente</label>
            <select style={{ ...inputSt, marginBottom:"24px" }} value={form.tipoCliente} onChange={e => setForm({...form, tipoCliente:e.target.value})}>
              <option value="nuevo">Nuevo</option>
              <option value="recurrente">Recurrente</option>
              <option value="moroso">Moroso</option>
            </select>
            <div style={{ display:"flex", gap:"12px" }}>
              <button style={{ flex:1, padding:"15px", border:"1.5px solid #e2e8f0", borderRadius:"10px", background:"#fff", fontSize:"15px", fontWeight:"600", cursor:"pointer", color:"#64748b" }} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={{ flex:1, padding:"15px", border:"none", borderRadius:"10px", background: saving?"#5eaaa4":"#1e40af", fontSize:"15px", fontWeight:"700", cursor: saving?"not-allowed":"pointer", color:"#fff" }} onClick={handleSave} disabled={saving}>{saving?"Guardando...":"Agregar Cliente"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
