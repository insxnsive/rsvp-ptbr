import { useEffect, useState } from "preact/hooks";
import { Clock3 } from "lucide-preact";

function calcRemaining(targetDate: string): { days: number; hours: number; minutes: number } | null {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

export default function Countdown({ startsAt }: { startsAt: string }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(startsAt));

  useEffect(() => {
    setRemaining(calcRemaining(startsAt));
    const interval = window.setInterval(() => {
      const r = calcRemaining(startsAt);
      setRemaining(r);
      if (!r) window.clearInterval(interval);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [startsAt]);

  if (!remaining) {
    return (
      <div class="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
        <Clock3 size={16} aria-hidden="true" />
        Evento em andamento
      </div>
    );
  }

  return (
    <div class="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-2.5 text-sm">
      <Clock3 size={16} aria-hidden="true" class="text-teal-700" />
      <span class="font-medium text-stone-700">Faltam</span>
      <div class="flex items-center gap-1.5">
        <span class="rounded-lg bg-white px-2 py-0.5 text-sm font-bold text-stone-950 shadow-sm">{remaining.days}d</span>
        <span class="rounded-lg bg-white px-2 py-0.5 text-sm font-bold text-stone-950 shadow-sm">{remaining.hours}h</span>
        <span class="rounded-lg bg-white px-2 py-0.5 text-sm font-bold text-stone-950 shadow-sm">{remaining.minutes}m</span>
      </div>
    </div>
  );
}
