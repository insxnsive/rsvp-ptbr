import { Heart } from "lucide-preact";

export default function Footer() {
  return (
    <footer class="mt-12 pb-6 text-center">
      <p class="text-xs text-stone-400">
        Feito com{" "}
        <Heart size={12} aria-hidden="true" class="inline text-rose-400" />{" "}
        RSVP
      </p>
    </footer>
  );
}
