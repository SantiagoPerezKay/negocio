import { useState, useEffect, useCallback } from "react";
import { cajaAPI, ventasAPI, stockAPI, clientesAPI } from "../api";
import { Plus, Trash2, DollarSign, CreditCard, Smartphone, Clock, AlertCircle, XCircle, CheckCircle, Loader } from "lucide-react";

const METODOS = ["efectivo", "transferencia", "tarjeta", "seña", "fiado"];

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

function CajaNoAbierta({ onAbrir }) {
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAbrir = async () => {
    setLoading(true);
    try {
      await cajaAPI.abrir({ monto_inicial: parseFloat(monto) || 0 });
      onAbrir();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏪</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>Abrir caja del día</h2>
        <p className="text-muted" style={{ marginBottom: 24, fontSize: "0.9rem" }}>
          Ingresá el monto inicial en efectivo para comenzar el día
        </p>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Caja inicial (efectivo)</label>
          <input
            id="caja-inicial"
            type="number"
            className="form-input"
            placeholder="$ 0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            style={{ fontSize: "1.2rem", textAlign: "center" }}
          />
        </div>
        <button id="btn-abrir-caja" className="btn btn-primary w-full" onClick={handleAbrir} disabled={loading}>
          {loading ? <Loader size={16} className="spin" /> : <CheckCircle size={16} />}
          Abrir caja
        </button>
      </div>
    </div>
  );
}

export default function Caja() {
  const [caja, setCaja] = useState(null);
  const [loadingCaja, setLoadingCaja] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);

  // nueva venta
  const [detalleLine, setDetalleLine] = useState("");
  const [detalles, setDetalles] = useState([]);
  const [metodos, setMetodos] = useState({ efectivo: "", transferencia: "", tarjeta: "", seña: "", fiado: "" });
  const [clienteId, setClienteId] = useState("");
  const [saving, setSaving] = useState(false);

  // gasto
  const [showGasto, setShowGasto] = useState(false);
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");

  // cierre
  const [showCierre, setShowCierre] = useState(false);
  const [montoCierre, setMontoCierre] = useState("");

  const cargarCaja = useCallback(async () => {
    setLoadingCaja(true);
    try {
      const r = await cajaAPI.actual();
      setCaja(r.data);
      if (r.data) {
        await Promise.all([cargarVentas(r.data.id), cargarGastos(r.data.id), cargarResumen(r.data.id)]);
      }
    } finally {
      setLoadingCaja(false);
    }
  }, []);

  async function cargarVentas(id) {
    const r = await ventasAPI.listar({ caja_id: id });
    setVentas(r.data);
  }

  async function cargarGastos(id) {
    const r = await ventasAPI.listarGastos({ caja_id: id });
    setGastos(r.data);
  }

  async function cargarResumen(id) {
    const r = await cajaAPI.resumen(id);
    setResumen(r.data);
  }

  useEffect(() => {
    cargarCaja();
    stockAPI.productos({ activo: true }).then((r) => setProductos(r.data));
    clientesAPI.listar().then((r) => setClientes(r.data));
  }, []);

  // Calcular total de la venta actual
  const totalDetalles = detalles.reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);
  const totalMetodos = Object.values(metodos).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const addDetalleProducto = (prod) => {
    setDetalles((prev) => {
      const exists = prev.find((d) => d.producto_id === prod.id);
      if (exists) {
        return prev.map((d) =>
          d.producto_id === prod.id ? { ...d, cantidad: d.cantidad + 1, subtotal: (d.cantidad + 1) * d.precio_unitario } : d
        );
      }
      return [...prev, { producto_id: prod.id, descripcion: prod.nombre, cantidad: 1, precio_unitario: parseFloat(prod.precio_venta), subtotal: parseFloat(prod.precio_venta) }];
    });
  };

  const addDetalleLibre = () => {
    if (!detalleLine.trim()) return;
    // parsear "Fotocopia x5 @50" o sólo texto+precio
    const match = detalleLine.match(/^(.+?)\s*x(\d+)\s*@\s*(\d+(?:\.\d+)?)$/i);
    if (match) {
      const [, desc, cant, precio] = match;
      setDetalles((p) => [...p, { descripcion: desc.trim(), cantidad: parseFloat(cant), precio_unitario: parseFloat(precio), subtotal: parseFloat(cant) * parseFloat(precio) }]);
    } else {
      const numMatch = detalleLine.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
      if (numMatch) {
        const [, desc, precio] = numMatch;
        setDetalles((p) => [...p, { descripcion: desc.trim(), cantidad: 1, precio_unitario: parseFloat(precio), subtotal: parseFloat(precio) }]);
      } else {
        setDetalles((p) => [...p, { descripcion: detalleLine.trim(), cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
      }
    }
    setDetalleLine("");
  };

  const removeDetalle = (i) => setDetalles((p) => p.filter((_, j) => j !== i));

  const guardarVenta = async () => {
    if (detalles.length === 0 && totalMetodos === 0) return;
    setSaving(true);
    try {
      const payload = {
        detalles: detalles.map(({ producto_id, descripcion, cantidad, precio_unitario }) => ({ producto_id, descripcion, cantidad, precio_unitario })),
        efectivo: parseFloat(metodos.efectivo) || 0,
        transferencia: parseFloat(metodos.transferencia) || 0,
        tarjeta: parseFloat(metodos.tarjeta) || 0,
        seña: parseFloat(metodos.seña) || 0,
        fiado: parseFloat(metodos.fiado) || 0,
        cliente_id: clienteId ? parseInt(clienteId) : null,
        caja_id: caja.id,
      };
      await ventasAPI.crear(payload);
      setDetalles([]);
      setMetodos({ efectivo: "", transferencia: "", tarjeta: "", seña: "", fiado: "" });
      setClienteId("");
      await cargarVentas(caja.id);
      await cargarResumen(caja.id);
    } finally {
      setSaving(false);
    }
  };

  const anularVenta = async (id) => {
    if (!confirm("¿Anular esta venta?")) return;
    await ventasAPI.anular(id);
    await cargarVentas(caja.id);
    await cargarResumen(caja.id);
  };

  const guardarGasto = async () => {
    if (!gastoDesc || !gastoMonto) return;
    await ventasAPI.crearGasto({ descripcion: gastoDesc, monto: parseFloat(gastoMonto), caja_id: caja.id });
    setGastoDesc(""); setGastoMonto(""); setShowGasto(false);
    await cargarGastos(caja.id);
    await cargarResumen(caja.id);
  };

  const cerrarCaja = async () => {
    if (!montoCierre) return;
    await cajaAPI.cerrar(caja.id, { monto_cierre_real: parseFloat(montoCierre) });
    setShowCierre(false);
    await cargarCaja();
  };

  if (loadingCaja) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader size={32} className="text-muted" />
      </div>
    );
  }

  if (!caja || caja.cerrada) return <CajaNoAbierta onAbrir={cargarCaja} />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Caja del día</h2>
          <p className="page-sub">
            Abierta: {new Date(caja.fecha_apertura).toLocaleString("es-AR")} · Inicial: {fmt(caja.monto_inicial)}
          </p>
        </div>
        <div className="flex gap-2">
          <button id="btn-nuevo-gasto" className="btn btn-ghost btn-sm" onClick={() => setShowGasto(true)}>
            <Trash2 size={14} /> Registrar gasto
          </button>
          <button id="btn-cerrar-caja" className="btn btn-danger btn-sm" onClick={() => setShowCierre(true)}>
            Cerrar caja
          </button>
        </div>
      </div>

      {/* Totales rápidos */}
      {resumen && (
        <div className="grid-4 mb-6">
          {[
            { label: "Total vendido", value: resumen.ventas.total, color: "var(--success)" },
            { label: "Efectivo", value: resumen.ventas.efectivo, color: "var(--text)" },
            { label: "Transfer.", value: resumen.ventas.transferencia, color: "var(--info)" },
            { label: "Fiado", value: resumen.ventas.fiado, color: "var(--danger)" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value money" style={{ color: s.color, fontSize: "1.5rem" }}>{fmt(s.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="caja-grid">
        {/* Columna izquierda: ventas del día */}
        <div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>
                Ventas del día ({ventas.filter((v) => !v.anulada).length})
              </h3>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hora</th>
                    <th>Detalle</th>
                    <th>Efectivo</th>
                    <th>Transfer.</th>
                    <th>Tarjeta</th>
                    <th>Seña</th>
                    <th>Fiado</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-muted" style={{ padding: 32 }}>
                        Aún no hay ventas registradas hoy
                      </td>
                    </tr>
                  )}
                  {ventas.map((v) => (
                    <tr key={v.id} style={{ opacity: v.anulada ? 0.4 : 1 }}>
                      <td className="text-muted">{v.id}</td>
                      <td className="text-muted">{new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        {v.detalle_libre || v.detalles?.map((d) => d.descripcion).join(", ") || "—"}
                        {v.anulada && <span className="badge badge-danger" style={{ marginLeft: 6 }}>ANULADA</span>}
                      </td>
                      <td className="text-success">{v.efectivo > 0 ? fmt(v.efectivo) : ""}</td>
                      <td style={{ color: "var(--info)" }}>{v.transferencia > 0 ? fmt(v.transferencia) : ""}</td>
                      <td style={{ color: "var(--primary)" }}>{v.tarjeta > 0 ? fmt(v.tarjeta) : ""}</td>
                      <td className="text-warning">{v.seña > 0 ? fmt(v.seña) : ""}</td>
                      <td className="text-danger">{v.fiado > 0 ? fmt(v.fiado) : ""}</td>
                      <td className="money font-bold">{fmt(v.total)}</td>
                      <td>
                        {!v.anulada && (
                          <button className="btn btn-ghost btn-sm" onClick={() => anularVenta(v.id)}>
                            <XCircle size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gastos */}
            {gastos.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text2)", marginBottom: 8 }}>GASTOS</h4>
                {gastos.map((g) => (
                  <div key={g.id} className="flex items-center justify-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.875rem" }}>{g.descripcion}</span>
                    <span className="text-danger money">{fmt(g.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: nueva venta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "1rem" }}>➕ Nueva venta</h3>

            {/* Búsqueda rápida de productos */}
            <div className="form-group mb-4">
              <label className="form-label">Escribir ítem (ej: "Fotocopia x5 @50" o "$700")</label>
              <div className="flex gap-2">
                <input
                  id="input-detalle"
                  className="form-input"
                  placeholder='ej: "Café 1200" o "Foto x10 @50"'
                  value={detalleLine}
                  onChange={(e) => setDetalleLine(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDetalleLibre()}
                />
                <button id="btn-add-detalle" className="btn btn-ghost btn-sm" onClick={addDetalleLibre}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Acceso rápido a productos frecuentes */}
            <div style={{ marginBottom: 16 }}>
              <div className="form-label mb-4">Acceso rápido</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {productos.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => addDetalleProducto(p)}
                  >
                    {p.nombre.split(" ").slice(0, 3).join(" ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Detalles actuales */}
            {detalles.length > 0 && (
              <div className="mb-4">
                {detalles.map((d, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                    <span>{d.cantidad > 1 ? `${d.cantidad}x ` : ""}{d.descripcion}</span>
                    <div className="flex items-center gap-2">
                      <span className="money">{fmt(d.cantidad * d.precio_unitario)}</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => removeDetalle(i)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between" style={{ marginTop: 8, fontWeight: 700 }}>
                  <span>Subtotal</span>
                  <span className="money text-success">{fmt(totalDetalles)}</span>
                </div>
              </div>
            )}

            <hr className="divider" />

            {/* Métodos de pago */}
            <div className="form-group mb-4">
              <label className="form-label">Método de pago (puede ser mixto)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {METODOS.map((m) => (
                  <div key={m} className="form-group">
                    <label className={`form-label payment-pill ${m} ${metodos[m] ? "active" : ""}`} style={{ marginBottom: 4, borderRadius: 6, padding: "4px 8px", display: "flex", justifyContent: "space-between" }}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </label>
                    <input
                      id={`metodo-${m}`}
                      type="number"
                      className="form-input"
                      placeholder="$"
                      value={metodos[m]}
                      onChange={(e) => setMetodos((p) => ({ ...p, [m]: e.target.value }))}
                      style={{ fontSize: "0.9rem" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cliente (para fiado) */}
            {metodos.fiado > 0 && (
              <div className="form-group mb-4">
                <label className="form-label text-danger">⚠ Cliente (requerido para fiado)</label>
                <select id="select-cliente" className="form-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.deuda_total > 0 ? `(debe ${fmt(c.deuda_total)})` : ""}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center" style={{ marginBottom: 16, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 600 }}>Total cobrado</span>
              <span className="money-lg text-success">{fmt(totalMetodos || totalDetalles)}</span>
            </div>

            <button
              id="btn-guardar-venta"
              className="btn btn-primary w-full"
              onClick={guardarVenta}
              disabled={saving || (detalles.length === 0 && totalMetodos === 0)}
            >
              {saving ? <Loader size={16} /> : <CheckCircle size={16} />}
              Registrar venta
            </button>
          </div>
        </div>
      </div>

      {/* Modal gasto */}
      {showGasto && (
        <div className="modal-overlay" onClick={() => setShowGasto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Registrar gasto</h3>
            <div className="flex-col flex gap-4">
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input id="gasto-desc" className="form-input" placeholder="Ej: Papel resma, limpieza..." value={gastoDesc} onChange={(e) => setGastoDesc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input id="gasto-monto" type="number" className="form-input" placeholder="$" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowGasto(false)}>Cancelar</button>
              <button id="btn-confirmar-gasto" className="btn btn-primary" onClick={guardarGasto}>Guardar gasto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cierre */}
      {showCierre && resumen && (
        <div className="modal-overlay" onClick={() => setShowCierre(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Cierre de caja</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {Object.entries(resumen.ventas).filter(([k]) => k !== "cantidad").map(([k, v]) => (
                <div key={k} className="stat-card card-sm">
                  <div className="stat-label">{k}</div>
                  <div className="stat-value" style={{ fontSize: "1.1rem" }}>{fmt(v)}</div>
                </div>
              ))}
              <div className="stat-card card-sm">
                <div className="stat-label">Gastos</div>
                <div className="stat-value text-danger" style={{ fontSize: "1.1rem" }}>{fmt(resumen.gastos)}</div>
              </div>
              <div className="stat-card card-sm">
                <div className="stat-label">Balance efectivo sistema</div>
                <div className="stat-value text-success" style={{ fontSize: "1.1rem" }}>{fmt(resumen.balance_efectivo)}</div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Efectivo contado en caja</label>
              <input id="cierre-monto" type="number" className="form-input" style={{ fontSize: "1.2rem" }} placeholder="$" value={montoCierre} onChange={(e) => setMontoCierre(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCierre(false)}>Cancelar</button>
              <button id="btn-confirmar-cierre" className="btn btn-danger" onClick={cerrarCaja}>Cerrar caja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
