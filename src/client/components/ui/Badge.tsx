type BadgeProps = {
  variant: "default" | "success" | "warning" | "info" | "danger";
  children: string;
};

const badgeClasses: Record<BadgeProps["variant"], string> = {
  default: "bg-stone-100 text-stone-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-teal-100 text-teal-800",
  danger: "bg-rose-100 text-rose-800"
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses[variant]}`}>
      {children}
    </span>
  );
}
