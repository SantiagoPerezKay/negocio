import { useState, useEffect } from "react";
import { stockAPI } from "../api";
import { Plus, AlertTriangle, Package, Edit2, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const TIPOS_HOJA = ["comun", "autoadhesiva", "ilustracion", "fotografica"];
const UNIDADES = ["unidad", "hoja", "resma", "kg", "litro", "paquete"];

export default function Stock() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState({ categoria: "", bajStock: false });
  const [modal, setModal] = useState(null); // null | "nuevo" | "editar" | "ajuste"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [ajuste, setAjuste] = useState({ cantidad: "", motivo: "" });
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    const params = {};
    if (filtro.categoria) params.categoria_id = filtro.categoria;
    if (filtro.bajStock) params.bajo_stock = true;
    const [prods, cats, al] = await Promise.all([
      stockAPI.productos(params),
      stockAPI.categorias(),
      stockAPI.alertas(),
    ]);
    setProductos(prods.data);
    setCategorias(cats.data);
    setAlertas(al.data);
  };

  useEffect(() => { cargar(); }, [filtro]);

  const abrirNuevo = () => {
    setForm({ nombre: "", categoria_id: "", tipo_hoja: "", precio_venta: "", precio_costo: "", stock_actual: "0", stock_minimo: "0", unidad: "unidad" });
    setModal("nuevo");
  };

  const abrirEditar = (p) => {
    setSelected(p);
    setForm({ nombre: p.nombre, categoria_id: p.categoria_id || "", tipo_hoja: p.tipo_hoja || "", precio_venta: p.precio_venta, precio_costo: p.precio_costo || "", stock_actual: p.stock_actual, stock_minimo: p.stock_minimo, unidad: p.unidad });
    setModal("editar");
  };

  const abrirAjuste = (p) => {
    setSelected(p);
    setAjuste({ cantidad: "", motivo: "" });
    setModal("ajuste");
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        precio_venta: parseFloat(form.precio_venta) || 0,
        precio_costo: parseFloat(form.precio_costo) || 0,
        stock_actual: parseFloat(form.stock_actual) || 0,
        stock_minimo: parseFloat(form.stock_minimo) || 0,
      };
      if (modal === "nuevo") await stockAPI.crearProducto(data);
      else await stockAPI.actualizarProducto(selected.id, data);
      setModal(null);
      cargar();
    } finally {
      setSaving(false);
    }
  };

  const guardarAjuste = async () => {
    if (!ajuste.cantidad) return;
    await stockAPI.ajustarStock(selected.id, { cantidad: parseFloat(ajuste.cantidad), motivo: ajuste.motivo });
    setModal(null);
    cargar();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Stock</h2>
          <p className="page-sub">{productos.length} productos · {alertas.length} alertas de stock bajo</p>
        </div>
        <button id="btn-nuevo-producto" className="btn btn-primary" onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {alertas.length > 0 && (
        <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
          <span style={{ fontSize: "0.875rem", color: "var(--warning)" }}>
            <b>{alertas.length} producto{alertas.length > 1 ? "s" : ""}</b> con stock bajo o agotado:{" "}
            {alertas.map((a) => a.nombre).join(", ")}
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <select id="filtro-categoria" className="form-select" style={{ width: 200 }} value={filtro.categoria} onChange={(e) => setFiltro((p) => ({ ...p, categoria: e.target.value }))}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2" style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--text2)" }}>
          <input id="filtro-bajo-stock" type="checkbox" checked={filtro.bajStock} onChange={(e) => setFiltro((p) => ({ ...p, bajStock: e.target.checked }))} />
          Solo stock bajo
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Tipo hoja</th>
              <th>Precio venta</th>
              <th>Precio costo</th>
              <th>Stock</th>
              <th>Mínimo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 && (
              <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 32 }}>Sin productos</td></tr>
            )}
            {productos.map((p) => {
              const bajStock = parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td className="text-muted">{p.categoria?.nombre || "—"}</td>
                  <td>{p.tipo_hoja ? <span className="badge badge-info">{p.tipo_hoja}</span> : "—"}</td>
                  <td className="money text-success">{fmt(p.precio_venta)}</td>
                  <td className="money text-muted">{p.precio_costo ? fmt(p.precio_costo) : "—"}</td>
                  <td style={{ fontWeight: 700, color: bajStock ? "var(--danger)" : "var(--success)" }}>
                    {parseFloat(p.stock_actual)} {p.unidad}
                  </td>
                  <td className="text-muted">{parseFloat(p.stock_minimo)} {p.unidad}</td>
                  <td>
                    {bajStock
                      ? <span className="badge badge-danger">Bajo stock</span>
                      : <span className="badge badge-success">OK</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" title="Ajustar stock" onClick={() => abrirAjuste(p)}>
                        <TrendingUp size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => abrirEditar(p)}>
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar */}
      {(modal === "nuevo" || modal === "editar") && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{modal === "nuevo" ? "Nuevo producto" : "Editar producto"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input id="prod-nombre" className="form-input" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select id="prod-categoria" className="form-select" value={form.categoria_id} onChange={(e) => setForm((p) => ({ ...p, categoria_id: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de hoja</label>
                  <select id="prod-tipo-hoja" className="form-select" value={form.tipo_hoja} onChange={(e) => setForm((p) => ({ ...p, tipo_hoja: e.target.value }))}>
                    <option value="">N/A</option>
                    {TIPOS_HOJA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Precio venta</label>
                  <input id="prod-precio-venta" type="number" className="form-input" value={form.precio_venta} onChange={(e) => setForm((p) => ({ ...p, precio_venta: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio costo</label>
                  <input id="prod-precio-costo" type="number" className="form-input" value={form.precio_costo} onChange={(e) => setForm((p) => ({ ...p, precio_costo: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Stock actual</label>
                  <input id="prod-stock" type="number" className="form-input" value={form.stock_actual} onChange={(e) => setForm((p) => ({ ...p, stock_actual: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input id="prod-stock-min" type="number" className="form-input" value={form.stock_minimo} onChange={(e) => setForm((p) => ({ ...p, stock_minimo: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select id="prod-unidad" className="form-select" value={form.unidad} onChange={(e) => setForm((p) => ({ ...p, unidad: e.target.value }))}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-producto" className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuste stock */}
      {modal === "ajuste" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Ajuste de stock</h3>
            <p className="text-muted" style={{ marginBottom: 20, fontSize: "0.9rem" }}>
              <b>{selected.nombre}</b> · Stock actual: <b>{parseFloat(selected.stock_actual)} {selected.unidad}</b>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Cantidad (+entrada / -salida)</label>
                <input id="ajuste-cantidad" type="number" className="form-input" placeholder="ej: +50 o -10" value={ajuste.cantidad} onChange={(e) => setAjuste((p) => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo (opcional)</label>
                <input id="ajuste-motivo" className="form-input" placeholder="ej: Compra a proveedor" value={ajuste.motivo} onChange={(e) => setAjuste((p) => ({ ...p, motivo: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-confirmar-ajuste" className="btn btn-primary" onClick={guardarAjuste}>Confirmar ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
