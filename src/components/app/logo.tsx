import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showText?: boolean;
}

export function Logo({ className, variant = "default", showText = true }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-9 w-9 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Bingkai jendela */}
        <rect
          x="6"
          y="4"
          width="36"
          height="32"
          rx="3"
          stroke={isLight ? "#faf8f3" : "#1e3a5f"}
          strokeWidth="2.5"
          fill={isLight ? "oklch(1 0 0 / 0.08)" : "oklch(0.34 0.09 245 / 0.06)"}
        />
        {/* Pembagi jendela */}
        <line x1="24" y1="4" x2="24" y2="36" stroke={isLight ? "#faf8f3" : "#1e3a5f"} strokeWidth="2.5" />
        <line x1="6" y1="20" x2="42" y2="20" stroke={isLight ? "#faf8f3" : "#1e3a5f"} strokeWidth="2.5" />
        {/* Cahaya / sinar */}
        <path
          d="M16 36 L14 44 M24 36 L24 45 M32 36 L34 44"
          stroke="#4a7c59"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Buku terbuka di bawah */}
        <path
          d="M8 40 Q8 37 11 37 L20 37 Q24 37 24 40 Q24 37 28 37 L37 37 Q40 37 40 40 L40 44 Q40 42 37 42 L28 42 Q24 42 24 45 Q24 42 20 42 L11 42 Q8 42 8 44 Z"
          fill={isLight ? "#faf8f3" : "#2d5a3d"}
          opacity="0.95"
        />
      </svg>
      {showText && (
        <div className="leading-tight">
          <div
            className={cn(
              "text-base font-bold tracking-tight",
              isLight ? "text-cream" : "text-primary"
            )}
            style={{ color: isLight ? "#faf8f3" : undefined }}
          >
            Jendela Ilmu
          </div>
          <div
            className={cn(
              "text-[10px] font-medium",
              isLight ? "text-cream/70" : "text-muted-foreground"
            )}
            style={{ color: isLight ? "oklch(0.96 0.01 85 / 0.7)" : undefined }}
          >
            Perpustakaan Digital
          </div>
        </div>
      )}
    </div>
  );
}
