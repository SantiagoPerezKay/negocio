import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// ── Caja ─────────────────────────────────────────────────────────────────────
export const cajaAPI = {
  actual: () => api.get("/caja/actual"),
  abrir: (data) => api.post("/caja/abrir", data),
  cerrar: (id, data) => api.post(`/caja/${id}/cerrar`, data),
  historial: () => api.get("/caja/historial"),
  resumen: (id) => api.get(`/caja/${id}/resumen`),
};

// ── Ventas ───────────────────────────────────────────────────────────────────
export const ventasAPI = {
  listar: (params) => api.get("/ventas/", { params }),
  crear: (data) => api.post("/ventas/", data),
  anular: (id) => api.delete(`/ventas/${id}`),
  crearGasto: (data) => api.post("/ventas/gastos", data),
  listarGastos: (params) => api.get("/ventas/gastos", { params }),
  eliminarGasto: (id) => api.delete(`/ventas/gastos/${id}`),
};

// ── Stock ─────────────────────────────────────────────────────────────────────
export const stockAPI = {
  categorias: () => api.get("/stock/categorias"),
  crearCategoria: (data) => api.post("/stock/categorias", data),
  eliminarCategoria: (id) => api.delete(`/stock/categorias/${id}`),
  productos: (params) => api.get("/stock/productos", { params }),
  crearProducto: (data) => api.post("/stock/productos", data),
  actualizarProducto: (id, data) => api.put(`/stock/productos/${id}`, data),
  eliminarProducto: (id) => api.delete(`/stock/productos/${id}`),
  ajustarStock: (id, data) => api.patch(`/stock/productos/${id}/ajuste`, data),
  alertas: () => api.get("/stock/alertas"),
};

// ── Clientes ──────────────────────────────────────────────────────────────────
export const clientesAPI = {
  listar: (params) => api.get("/clientes/", { params }),
  crear: (data) => api.post("/clientes/", data),
  obtener: (id) => api.get(`/clientes/${id}`),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
  registrarPago: (id, data) => api.post(`/clientes/${id}/pagos`, data),
  historialPagos: (id) => api.get(`/clientes/${id}/pagos`),
};

// ── Proveedores ───────────────────────────────────────────────────────────────
export const proveedoresAPI = {
  listar: () => api.get("/proveedores/"),
  crear: (data) => api.post("/proveedores/", data),
  actualizar: (id, data) => api.put(`/proveedores/${id}`, data),
  eliminar: (id) => api.delete(`/proveedores/${id}`),
  registrarCompra: (data) => api.post("/proveedores/compras", data),
  listarCompras: (params) => api.get("/proveedores/compras", { params }),
};

// ── Estadísticas ──────────────────────────────────────────────────────────────
export const estadisticasAPI = {
  resumen: (params) => api.get("/estadisticas/resumen", { params }),
  ventasPorDia: (params) => api.get("/estadisticas/ventas-por-dia", { params }),
  productosMasVendidos: (params) =>
    api.get("/estadisticas/productos-mas-vendidos", { params }),
};

export default api;
