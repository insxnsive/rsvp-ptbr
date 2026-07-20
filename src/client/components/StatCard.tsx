import type { Users } from "lucide-preact";

export default function StatCard({
  icon: Icon,
  label,
  value,
  total,
  tone
}: {
  icon: typeof Users;
  label: string;
  value: number;
  total?: number;
  tone: "teal" | "amber" | "rose";
}) {
  const toneClasses = {
    teal: "border-teal-200 bg-linear-to-br from-white via-teal-50 to-cyan-50",
    amber: "border-amber-200 bg-linear-to-br from-white via-amber-50 to-orange-50",
    rose: "border-rose-200 bg-linear-to-br from-white via-rose-50 to-pink-50"
  } as const;

  const barTone = {
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500"
  } as const;

  const percent = total && total > 0 ? Math.min(100, Math.round((value / total) * 100)) : null;

  return (
    <div class={`rounded-xl border p-3 shadow-sm ${toneClasses[tone]}`}>
      <div class="flex items-center gap-2 text-xs font-medium text-stone-600">
        <Icon size={15} aria-hidden="true" />
        {label}
      </div>
      <p class="mt-1 text-2xl font-semibold text-stone-950">{value}</p>
      {percent !== null ? (
        <div class="mt-2">
          <div class="flex items-center justify-between text-xs text-stone-500">
            <span>{percent}%</span>
            <span>de {total}</span>
          </div>
          <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/80">
            <div class={`h-full rounded-full transition-all duration-500 ${barTone[tone]}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
