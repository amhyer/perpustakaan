"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  title: string;
  author?: string;
  color?: string;
  coverImage?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BookCover({ title, author, color = "#1e3a5f", coverImage, className, size = "md" }: BookCoverProps) {
  const sizes = {
    sm: "aspect-[3/4] text-[10px]",
    md: "aspect-[3/4] text-xs",
    lg: "aspect-[3/4] text-sm",
  };

  const [imgError, setImgError] = useState(false);
  const [prevCover, setPrevCover] = useState(coverImage);
  if (prevCover !== coverImage) {
    setPrevCover(coverImage);
    setImgError(false);
  }

  if (coverImage && !imgError) {
    return (
      <div className={cn("relative w-full overflow-hidden rounded-lg shadow-md", sizes[size], className)}>
        <img
          src={coverImage}
          alt={title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  // Generate a secondary color for gradient
  const secondary = adjustColor(color, 25);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg shadow-md flex flex-col justify-between p-3",
        sizes[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)`,
      }}
    >
      {/* Decorative window pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      {/* Spine highlight */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/20" />
      {/* Shine */}
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-white/10 blur-xl" />

      <div className="relative z-10">
        <div className="inline-block rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          Jendela Ilmu
        </div>
      </div>

      <div className="relative z-10">
        <h3
          className={cn(
            "font-bold leading-tight text-white line-clamp-3 drop-shadow-sm",
            size === "sm" ? "text-[11px]" : size === "lg" ? "text-base" : "text-xs"
          )}
        >
          {title}
        </h3>
        {author && (
          <p
            className={cn(
              "mt-1 text-white/70 line-clamp-1",
              size === "sm" ? "text-[9px]" : "text-[10px]"
            )}
          >
            {author}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to lighten/darken a hex color
function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + Math.round((255 * percent) / 100)));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch (e) {
    console.error("Failed to lighten hex color:", e);
    return hex;
  }
}
