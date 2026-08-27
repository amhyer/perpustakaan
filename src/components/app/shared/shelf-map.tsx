"use client";

import { MapPin } from "lucide-react";
import { aisleHint } from "@/lib/opac";
import { cn } from "@/lib/utils";

const AISLES = [
  { codes: ["A-01", "B-01", "C-01"], label: "Lorong kiri", side: "kiri" },
  { codes: ["D-01", "E-01"], label: "Lorong tengah", side: "tengah" },
  { codes: ["F-01"], label: "Lorong kanan", side: "kanan" },
] as const;

export function ShelfMap({
  code,
  name,
  className,
}: {
  code?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (!code) return null;
  const hint = aisleHint(code);

  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-3", className)}>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            Buku di {code}
            {name ? ` · ${name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {AISLES.map((aisle) => {
          const active = aisle.codes.includes(code as (typeof aisle.codes)[number]);
          return (
            <div
              key={aisle.side}
              className={cn(
                "rounded-lg border px-2 py-2 text-center",
                active ? "border-primary bg-primary/10" : "bg-muted/40"
              )}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{aisle.label}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {aisle.codes.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[11px]",
                      c === code ? "bg-primary text-primary-foreground" : "bg-background"
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
