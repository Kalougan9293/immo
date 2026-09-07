import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "pearl" | "gold" | "overlay";
};

export function Badge({ children, className, tone = "pearl" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] uppercase",
        tone === "pearl" &&
          "border-white/12 bg-white/[0.04] text-muted-strong",
        tone === "gold" &&
          "border-gold/35 bg-gold-soft text-gold",
        tone === "overlay" &&
          "border-white/25 bg-black/70 text-white shadow-[0_2px_12px_rgba(0,0,0,0.5)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </span>
  );
}
