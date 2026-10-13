import { ComponentType, lazy } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import type { MfeProps } from "./contract";
import LoginPage from "./LoginPage";
import { RemoteBoundary } from "./RemoteBoundary";

const Matriculas = lazy(() => import("mfe_matriculas/App")) as unknown as ComponentType<MfeProps>;
const Financeiro = lazy(() => import("mfe_financeiro/App")) as unknown as ComponentType<MfeProps>;
const Eventos = lazy(() => import("mfe_eventos/App")) as unknown as ComponentType<MfeProps>;

export default function App() {
  const { usuario, api, sair } = useAuth();
  if (!usuario) return <Routes><Route path="*" element={<LoginPage />} /></Routes>;

  const props: MfeProps = { api, usuario };
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">GymCRM</div>
        <nav>
          <NavLink to="/matriculas">Matrículas</NavLink>
          <NavLink to="/financeiro">Financeiro</NavLink>
          <NavLink to="/eventos">Monitor de eventos</NavLink>
        </nav>
        <div className="user">
          <div><strong>{usuario.nome}</strong></div>
          <div className="muted small">{usuario.perfil} · {usuario.tenantId}</div>
          <button className="link" onClick={sair}>Sair</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/matriculas" element={<RemoteBoundary nome="Matrículas"><Matriculas {...props} /></RemoteBoundary>} />
          <Route path="/financeiro" element={<RemoteBoundary nome="Financeiro"><Financeiro {...props} /></RemoteBoundary>} />
          <Route path="/eventos" element={<RemoteBoundary nome="Monitor de eventos"><Eventos {...props} /></RemoteBoundary>} />
          <Route path="*" element={<Navigate to="/matriculas" replace />} />
        </Routes>
      </main>
    </div>
  );
}
