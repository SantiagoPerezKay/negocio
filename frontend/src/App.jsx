import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Package, Users, Truck, BarChart2, DollarSign, AlertTriangle
} from "lucide-react";
import Caja from "./pages/Caja";
import Stock from "./pages/Stock";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Estadisticas from "./pages/Estadisticas";
import "./index.css";

const navItems = [
  { to: "/",            icon: <DollarSign />,   label: "Caja del día"  },
  { to: "/stock",       icon: <Package />,       label: "Stock"         },
  { to: "/clientes",    icon: <Users />,         label: "Clientes / Fiado" },
  { to: "/proveedores", icon: <Truck />,         label: "Proveedores"   },
  { to: "/estadisticas",icon: <BarChart2 />,     label: "Estadísticas"  },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>📋 Local Fotocopiadora</h1>
        <span>Sistema de gestión</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-alerts">
        <NavLink to="/stock?alerta=1" className="alert-badge">
          <AlertTriangle size={14} />
          <span>Ver alertas de stock</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"            element={<Caja />}         />
            <Route path="/stock"       element={<Stock />}        />
            <Route path="/clientes"    element={<Clientes />}     />
            <Route path="/proveedores" element={<Proveedores />}  />
            <Route path="/estadisticas"element={<Estadisticas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
