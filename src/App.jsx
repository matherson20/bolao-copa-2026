import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useAuth } from "./lib/useAuth.jsx";
import Login from "./components/Login.jsx";
import Grupos from "./components/Grupos.jsx";
import MataMata from "./components/MataMata.jsx";
import Hoje from "./components/Hoje.jsx";
import Ranking from "./components/Ranking.jsx";
import Admin from "./components/Admin.jsx";

function Header() {
  const { perfil, user, logout } = useAuth();
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-marca">
          <span className="header-escudo">🏆</span>
          <div>
            <div className="header-nome">Bolão Copa 2026</div>
            <div className="header-sub">Canadá · México · EUA</div>
          </div>
        </div>

        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? "hnav-item ativo" : "hnav-item"}>
            <span className="hnav-icon">⚽</span><span>Grupos</span>
          </NavLink>
          <NavLink to="/matamata" className={({ isActive }) => isActive ? "hnav-item ativo" : "hnav-item"}>
            <span className="hnav-icon">🏆</span><span>Mata-mata</span>
          </NavLink>
          <NavLink to="/hoje" className={({ isActive }) => isActive ? "hnav-item ativo" : "hnav-item"}>
            <span className="hnav-icon">📅</span><span>Hoje</span>
          </NavLink>
          <NavLink to="/ranking" className={({ isActive }) => isActive ? "hnav-item ativo" : "hnav-item"}>
            <span className="hnav-icon">🏅</span><span>Ranking</span>
          </NavLink>
          {perfil?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? "hnav-item ativo" : "hnav-item"}>
              <span className="hnav-icon">⚙️</span><span>Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="header-user">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="header-avatar" />
            : <div className="header-avatar-fallback">{(perfil?.nome || user?.displayName || "?")[0]}</div>
          }
          <span className="header-username">
            {(perfil?.nome || user?.displayName || "").split(" ")[0]}
            {perfil?.isAdmin && <span className="badge-adm">ADM</span>}
          </span>
          <button className="header-sair" onClick={logout} title="Sair">✕</button>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { perfil } = useAuth();
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? "bnav-item ativo" : "bnav-item"}>
        <span>⚽</span><span>Grupos</span>
      </NavLink>
      <NavLink to="/matamata" className={({ isActive }) => isActive ? "bnav-item ativo" : "bnav-item"}>
        <span>🏆</span><span>Mata-mata</span>
      </NavLink>
      <NavLink to="/hoje" className={({ isActive }) => isActive ? "bnav-item ativo" : "bnav-item"}>
        <span>📅</span><span>Hoje</span>
      </NavLink>
      <NavLink to="/ranking" className={({ isActive }) => isActive ? "bnav-item ativo" : "bnav-item"}>
        <span>🏅</span><span>Ranking</span>
      </NavLink>
      {perfil?.isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => isActive ? "bnav-item ativo" : "bnav-item"}>
          <span>⚙️</span><span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

export default function App() {
  const { user, loading, perfil } = useAuth();

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-logo">🏆</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Grupos />} />
          <Route path="/matamata" element={<MataMata />} />
          <Route path="/hoje" element={<Hoje />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/admin" element={perfil?.isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
