import { Link, Lock } from "lucide-preact";

export default function NotFound() {
  return (
    <main class="grid min-h-screen place-items-center px-4">
      <section class="soft-panel max-w-md rounded-2xl p-6 text-center">
        <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-500">
          <Link size={28} aria-hidden="true" />
        </div>
        <h1 class="text-xl font-bold text-stone-950">Link nao encontrado</h1>
        <p class="mt-2 text-sm text-stone-600">O link acessado nao existe ou foi removido.</p>
        <a
          class="touch-button mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white"
          href="/rsvp"
        >
          <Lock size={18} aria-hidden="true" />
          Area RSVP
        </a>
      </section>
    </main>
  );
}
