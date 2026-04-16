import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  Package, Users, Truck, BarChart2, DollarSign, AlertTriangle,
  Sun, Moon, Menu, X, List
} from "lucide-react";
import Caja from "./pages/Caja";
import Stock from "./pages/Stock";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Estadisticas from "./pages/Estadisticas";
import Movimientos from "./pages/Movimientos";
import "./index.css";

// ── Theme context ────────────────────────────────────────
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Nav items ────────────────────────────────────────────
const navItems = [
  { to: "/",            icon: <DollarSign />,  label: "Caja del día"    },
  { to: "/stock",       icon: <Package />,     label: "Stock"           },
  { to: "/clientes",    icon: <Users />,       label: "Clientes / Fiado"},
  { to: "/proveedores", icon: <Truck />,       label: "Proveedores"     },
  { to: "/movimientos", icon: <List />,         label: "Movimientos"     },
  { to: "/estadisticas",icon: <BarChart2 />,   label: "Estadísticas"    },
];

// ── Sidebar ──────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="flex items-center justify-between">
            <h1>Local Fotocopiadora</h1>
            <button className="sidebar-close-btn show-mobile" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <span>Sistema de gestión</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/stock?alerta=1" className="alert-badge" onClick={onClose}>
            <AlertTriangle size={14} />
            <span>Ver alertas de stock</span>
          </NavLink>

          <button className="theme-toggle" onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Mobile Header ────────────────────────────────────────
function MobileHeader({ onMenuClick }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="mobile-header show-mobile">
      <button className="mobile-menu-btn" onClick={onMenuClick}>
        <Menu size={22} />
      </button>
      <h1 className="mobile-header-title">Fotocopiadora</h1>
      <button className="theme-toggle-mini" onClick={toggle}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}

// ── App ──────────────────────────────────────────────────
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Caja />}         />
          <Route path="/stock"        element={<Stock />}        />
          <Route path="/clientes"     element={<Clientes />}     />
          <Route path="/proveedores"  element={<Proveedores />}  />
          <Route path="/movimientos"  element={<Movimientos />}  />
          <Route path="/estadisticas" element={<Estadisticas />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}
