type GroupChipsProps = {
  value: string;
  onChange: (value: string) => void;
  counts?: { all: number; adulto: number; crianca: number };
};

export default function GroupChips({ value, onChange, counts }: GroupChipsProps) {
  const options = [
    { key: "", label: "Todos", count: counts?.all },
    { key: "adulto", label: "Adultos", count: counts?.adulto },
    { key: "crianca", label: "Criancas", count: counts?.crianca }
  ];

  return (
    <div class="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          class={`touch-button inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
            value === opt.key
              ? "bg-teal-700 text-white shadow-sm"
              : "border border-stone-200 bg-white text-stone-700 hover:border-teal-200 hover:bg-teal-50"
          }`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
          {opt.count !== undefined ? (
            <span class={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
              value === opt.key ? "bg-white/20" : "bg-stone-100 text-stone-500"
            }`}>
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
