import { useState, useEffect } from "react";
import { proveedoresAPI, stockAPI } from "../api";
import { Plus, ShoppingBag, Trash2 } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "", email: "", notas: "" });
  const [compraForm, setCompraForm] = useState({ proveedor_id: "", pagado: "0", notas: "", detalles: [] });
  const [detalleLine, setDetalleLine] = useState({ producto_id: "", descripcion: "", cantidad: "1", precio_costo: "" });
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    const [prov, comps, prods] = await Promise.all([
      proveedoresAPI.listar(),
      proveedoresAPI.listarCompras(),
      stockAPI.productos({}),
    ]);
    setProveedores(prov.data);
    setCompras(comps.data);
    setProductos(prods.data);
  };

  useEffect(() => { cargar(); }, []);

  const guardarProveedor = async () => {
    setSaving(true);
    try {
      await proveedoresAPI.crear(form);
      setModal(null);
      cargar();
    } finally { setSaving(false); }
  };

  const addDetalle = () => {
    if (!detalleLine.cantidad || !detalleLine.precio_costo) return;
    const prod = productos.find((p) => p.id === parseInt(detalleLine.producto_id));
    setCompraForm((p) => ({
      ...p,
      detalles: [...p.detalles, {
        producto_id: detalleLine.producto_id ? parseInt(detalleLine.producto_id) : null,
        descripcion: prod ? prod.nombre : detalleLine.descripcion,
        cantidad: parseFloat(detalleLine.cantidad),
        precio_costo: parseFloat(detalleLine.precio_costo),
      }],
    }));
    setDetalleLine({ producto_id: "", descripcion: "", cantidad: "1", precio_costo: "" });
  };

  const removeDetalle = (i) =>
    setCompraForm((p) => ({ ...p, detalles: p.detalles.filter((_, j) => j !== i) }));

  const guardarCompra = async () => {
    if (!compraForm.proveedor_id || compraForm.detalles.length === 0) return;
    setSaving(true);
    try {
      await proveedoresAPI.registrarCompra({
        proveedor_id: parseInt(compraForm.proveedor_id),
        pagado: parseFloat(compraForm.pagado) || 0,
        notas: compraForm.notas,
        detalles: compraForm.detalles,
      });
      setModal(null);
      cargar();
    } finally { setSaving(false); }
  };

  const totalDeudaProveedores = proveedores.reduce((s, p) => s + parseFloat(p.deuda_total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Proveedores</h2>
          <p className="page-sub">Deuda con proveedores: <span className="text-warning money">{fmt(totalDeudaProveedores)}</span></p>
        </div>
        <div className="flex gap-2">
          <button id="btn-nueva-compra" className="btn btn-ghost" onClick={() => { setCompraForm({ proveedor_id: "", pagado: "0", notas: "", detalles: [] }); setModal("compra"); }}>
            <ShoppingBag size={16} /> Registrar compra
          </button>
          <button id="btn-nuevo-proveedor" className="btn btn-primary" onClick={() => { setForm({ nombre: "", contacto: "", telefono: "", email: "", notas: "" }); setModal("nuevo"); }}>
            <Plus size={16} /> Nuevo proveedor
          </button>
        </div>
      </div>

      {/* Proveedores */}
      <div className="table-wrap mb-6">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Deuda</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 && <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 32 }}>Sin proveedores</td></tr>}
            {proveedores.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                <td className="text-muted">{p.contacto || "—"}</td>
                <td className="text-muted">{p.telefono || "—"}</td>
                <td>
                  <span className={`money font-bold ${parseFloat(p.deuda_total) > 0 ? "text-warning" : "text-muted"}`}>
                    {parseFloat(p.deuda_total) > 0 ? fmt(p.deuda_total) : "Al día"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Últimas compras */}
      <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "1rem" }}>Últimas compras</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {compras.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 32 }}>Sin compras</td></tr>}
            {compras.slice(0, 20).map((c) => (
              <tr key={c.id}>
                <td className="text-muted">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                <td style={{ fontWeight: 500 }}>{c.proveedor?.nombre || "—"}</td>
                <td className="money">{fmt(c.total)}</td>
                <td className="money text-success">{fmt(c.pagado)}</td>
                <td className="money text-warning">{parseFloat(c.saldo) > 0 ? fmt(c.saldo) : "—"}</td>
                <td className="text-muted">{c.notas || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo proveedor */}
      {modal === "nuevo" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Nuevo proveedor</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["nombre", "Nombre *"], ["contacto", "Contacto"], ["telefono", "Teléfono"], ["email", "Email"]].map(([k, label]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{label}</label>
                  <input id={`prov-${k}`} className="form-input" value={form[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-proveedor" className="btn btn-primary" onClick={guardarProveedor} disabled={saving}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal compra */}
      {modal === "compra" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Registrar compra</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select id="compra-proveedor" className="form-select" value={compraForm.proveedor_id} onChange={(e) => setCompraForm((p) => ({ ...p, proveedor_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* Líneas de compra */}
              <div style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: 12 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Ítems comprados</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                  <select id="compra-det-producto" className="form-select" style={{ fontSize: "0.8rem" }} value={detalleLine.producto_id} onChange={(e) => setDetalleLine((p) => ({ ...p, producto_id: e.target.value }))}>
                    <option value="">Producto / descripción libre</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <input id="compra-det-cantidad" type="number" className="form-input" placeholder="Cant." style={{ fontSize: "0.8rem" }} value={detalleLine.cantidad} onChange={(e) => setDetalleLine((p) => ({ ...p, cantidad: e.target.value }))} />
                  <input id="compra-det-precio" type="number" className="form-input" placeholder="$ costo" style={{ fontSize: "0.8rem" }} value={detalleLine.precio_costo} onChange={(e) => setDetalleLine((p) => ({ ...p, precio_costo: e.target.value }))} />
                  <button className="btn btn-primary btn-sm" onClick={addDetalle}><Plus size={14} /></button>
                </div>
                {compraForm.detalles.map((d, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ fontSize: "0.825rem", padding: "4px 0", borderTop: "1px solid var(--border)" }}>
                    <span>{d.cantidad}x {d.descripcion || "—"}</span>
                    <div className="flex items-center gap-2">
                      <span className="money">{fmt(d.cantidad * d.precio_costo)}</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => removeDetalle(i)}><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
                {compraForm.detalles.length > 0 && (
                  <div className="flex justify-between" style={{ marginTop: 8, fontWeight: 700, fontSize: "0.875rem" }}>
                    <span>Total</span>
                    <span className="money">{fmt(compraForm.detalles.reduce((s, d) => s + d.cantidad * d.precio_costo, 0))}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Monto pagado</label>
                <input id="compra-pagado" type="number" className="form-input" placeholder="$" value={compraForm.pagado} onChange={(e) => setCompraForm((p) => ({ ...p, pagado: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-compra" className="btn btn-primary" onClick={guardarCompra} disabled={saving}>
                {saving ? "Guardando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
