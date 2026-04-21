import React from "react";

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error en vista protegida:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-red-500/20 bg-slate-900/90 p-6 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
            Recuperacion de pantalla
          </p>
          <h1 className="mt-3 text-2xl font-black uppercase tracking-[0.14em] text-white">
            La vista encontro un error inesperado
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
            Puedes recargar la terminal sin cerrar sesion para seguir trabajando.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 rounded-[1.2rem] bg-cyan-400 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 transition-all hover:bg-cyan-300"
          >
            Recargar terminal
          </button>
        </div>
      </div>
    );
  }
}

export default ViewErrorBoundary;
