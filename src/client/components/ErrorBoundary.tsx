import { Component } from "preact";
import type { ComponentChildren } from "preact";
import { AlertTriangle } from "lucide-preact";

type Props = { children: ComponentChildren };
type State = { hasError: boolean; error: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, error: message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main class="grid min-h-screen place-items-center px-4">
          <section class="soft-panel max-w-md rounded-2xl p-6 text-center">
            <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <AlertTriangle size={28} aria-hidden="true" />
            </div>
            <h1 class="text-xl font-bold text-stone-950">Algo deu errado</h1>
            <p class="mt-2 text-sm text-stone-600">{this.state.error || "Erro inesperado."}</p>
            <button
              class="touch-button mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white"
              type="button"
              onClick={() => this.setState({ hasError: false, error: "" })}
            >
              Tentar novamente
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
