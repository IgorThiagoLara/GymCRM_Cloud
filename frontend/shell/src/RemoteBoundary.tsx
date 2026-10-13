import { Component, ReactNode, Suspense } from "react";

class Boundary extends Component<{ nome: string; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  componentDidCatch(e: unknown) { console.error(`[shell] falha no microfrontend ${this.props.nome}`, e); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="card erro">
        <strong>O módulo “{this.props.nome}” está indisponível.</strong>
        <p>O restante do sistema continua funcionando. Tente novamente em instantes.</p>
        <button onClick={() => this.setState({ erro: false })}>Tentar de novo</button>
      </div>
    );
  }
}

export function RemoteBoundary({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <Boundary nome={nome}>
      <Suspense fallback={<div className="card muted">Carregando {nome}…</div>}>{children}</Suspense>
    </Boundary>
  );
}
