import { useState, useEffect } from "react";
import { clientesAPI } from "../api";
import { Plus, DollarSign, ChevronRight, AlertCircle } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [soloDeuda, setSoloDeuda] = useState(false);
  const [modal, setModal] = useState(null); // null | "nuevo" | "pago" | "detalle"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", notas: "" });
  const [pago, setPago] = useState({ monto: "", metodo: "efectivo", notas: "" });
  const [historial, setHistorial] = useState([]);

  const cargar = async () => {
    const r = await clientesAPI.listar(soloDeuda ? { con_deuda: true } : {});
    setClientes(r.data);
  };

  useEffect(() => { cargar(); }, [soloDeuda]);

  const guardarCliente = async () => {
    if (modal === "nuevo") await clientesAPI.crear(form);
    else await clientesAPI.actualizar(selected.id, form);
    setModal(null);
    cargar();
  };

  const abrirPago = (c) => {
    setSelected(c);
    setPago({ monto: "", metodo: "efectivo", notas: "" });
    setModal("pago");
  };

  const abrirDetalle = async (c) => {
    setSelected(c);
    const r = await clientesAPI.historialPagos(c.id);
    setHistorial(r.data);
    setModal("detalle");
  };

  const registrarPago = async () => {
    if (!pago.monto) return;
    await clientesAPI.registrarPago(selected.id, { monto: parseFloat(pago.monto), metodo: pago.metodo, notas: pago.notas });
    setModal(null);
    cargar();
  };

  const totalDeuda = clientes.reduce((s, c) => s + parseFloat(c.deuda_total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Clientes / Fiado</h2>
          <p className="page-sub">Deuda total: <span className="text-danger money">{fmt(totalDeuda)}</span></p>
        </div>
        <button id="btn-nuevo-cliente" className="btn btn-primary" onClick={() => { setForm({ nombre: "", telefono: "", email: "", notas: "" }); setModal("nuevo"); }}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2" style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--text2)" }}>
          <input id="filtro-solo-deuda" type="checkbox" checked={soloDeuda} onChange={(e) => setSoloDeuda(e.target.checked)} />
          Solo con deuda
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Deuda total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 32 }}>Sin clientes</td></tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                <td className="text-muted">{c.telefono || "—"}</td>
                <td className="text-muted">{c.email || "—"}</td>
                <td>
                  <span className={`money font-bold ${parseFloat(c.deuda_total) > 0 ? "text-danger" : "text-muted"}`}>
                    {parseFloat(c.deuda_total) > 0 ? fmt(c.deuda_total) : "Sin deuda"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    {parseFloat(c.deuda_total) > 0 && (
                      <button className="btn btn-success btn-sm" onClick={() => abrirPago(c)}>
                        <DollarSign size={13} /> Cobrar
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => abrirDetalle(c)}>
                      <ChevronRight size={13} /> Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar */}
      {(modal === "nuevo" || modal === "editar-c") && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Nuevo cliente</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["nombre", "Nombre *"], ["telefono", "Teléfono"], ["email", "Email"], ["notas", "Notas"]].map(([k, label]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{label}</label>
                  <input id={`cliente-${k}`} className="form-input" value={form[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-cliente" className="btn btn-primary" onClick={guardarCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modal === "pago" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Cobrar deuda</h3>
            <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: "0.875rem", color: "var(--danger)" }}>
                <b>{selected.nombre}</b> debe <b>{fmt(selected.deuda_total)}</b>
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Monto a cobrar</label>
                <input id="pago-monto" type="number" className="form-input" style={{ fontSize: "1.2rem" }} placeholder={`Máx: ${fmt(selected.deuda_total)}`} value={pago.monto} onChange={(e) => setPago((p) => ({ ...p, monto: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Método</label>
                <select id="pago-metodo" className="form-select" value={pago.metodo} onChange={(e) => setPago((p) => ({ ...p, metodo: e.target.value }))}>
                  {["efectivo", "transferencia", "tarjeta"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-confirmar-pago" className="btn btn-success" onClick={registrarPago}>Confirmar cobro</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {modal === "detalle" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{selected.nombre}</h3>
            <div className="grid-2 mb-4">
              <div className="stat-card card-sm">
                <div className="stat-label">Deuda actual</div>
                <div className="stat-value text-danger" style={{ fontSize: "1.3rem" }}>{fmt(selected.deuda_total)}</div>
              </div>
              <div className="stat-card card-sm">
                <div className="stat-label">Teléfono</div>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: 4 }}>{selected.telefono || "—"}</div>
              </div>
            </div>
            <h4 style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text2)", marginBottom: 10 }}>HISTORIAL DE PAGOS</h4>
            {historial.length === 0
              ? <p className="text-muted" style={{ fontSize: "0.875rem" }}>Sin pagos registrados</p>
              : historial.map((h) => (
                <div key={h.id} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.875rem" }}>
                  <div>
                    <span className="badge badge-success" style={{ marginRight: 8 }}>{h.metodo}</span>
                    {new Date(h.fecha).toLocaleDateString("es-AR")}
                  </div>
                  <span className="money text-success">{fmt(h.monto)}</span>
                </div>
              ))}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              {parseFloat(selected.deuda_total) > 0 && (
                <button id="btn-cobrar-desde-detalle" className="btn btn-success" onClick={() => { setModal(null); setTimeout(() => abrirPago(selected), 50); }}>
                  <DollarSign size={14} /> Cobrar ahora
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
