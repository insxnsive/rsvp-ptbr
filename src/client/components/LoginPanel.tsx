import { useState } from "preact/hooks";
import { Check, LoaderCircle, Lock } from "lucide-preact";
import { api } from "../api.js";
import type { SessionResponse } from "../types.js";
import { apiMessage } from "../utils.js";

export default function LoginPanel({ onAuthenticated }: { onAuthenticated: (session: SessionResponse) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: Event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const session = await api.login(username.trim(), password);
      onAuthenticated(session);
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main class="mx-auto grid min-h-screen w-full max-w-md place-items-center px-4 py-8">
      <form class="soft-panel animate-rise w-full rounded-2xl p-6" onSubmit={submit}>
        <div class="mb-6 flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 text-teal-700 shadow-sm">
            <Lock size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-stone-950">Acesso RSVP</h1>
            <p class="text-sm text-stone-500">Area administrativa protegida.</p>
          </div>
        </div>
        <label class="mb-3 block text-sm font-medium text-stone-700">
          Usuario
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-950 shadow-sm transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            autocomplete="username"
            value={username}
            onInput={(e) => setUsername(e.currentTarget.value)}
            required
          />
        </label>
        <label class="mb-4 block text-sm font-medium text-stone-700">
          Senha
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-950 shadow-sm transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            type="password"
            autocomplete="current-password"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
          />
        </label>
        <button
          class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? <LoaderCircle class="animate-spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
          Entrar
        </button>
        {message ? <p class="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
      </form>
    </main>
  );
}
