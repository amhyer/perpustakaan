"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCoverImage } from "@/lib/cover";

interface BookCoverProps {
  title: string;
  author?: string;
  color?: string;
  coverImage?: string | null;
  isbn?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
}

export function BookCover({
  title,
  author,
  color = "#1e3a5f",
  coverImage,
  isbn,
  className,
  size = "md",
  tilt = true,
}: BookCoverProps) {
  const sizes = {
    sm: "aspect-[3/4] text-[10px]",
    md: "aspect-[3/4] text-xs",
    lg: "aspect-[3/4] text-sm",
  };

  const resolved = resolveCoverImage({ coverImage, isbn });
  const [imgError, setImgError] = useState(false);
  const [prevCover, setPrevCover] = useState(resolved);
  if (prevCover !== resolved) {
    setPrevCover(resolved);
    setImgError(false);
  }

  const tiltClass = tilt
    ? "-rotate-2 hover:rotate-0 hover:-translate-y-1 transition-transform duration-300 origin-bottom"
    : "";

  if (resolved && !imgError) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10",
          sizes[size],
          tiltClass,
          className
        )}
      >
        <img
          src={resolved}
          alt={title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  const secondary = adjustColor(color, 25);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg shadow-lg ring-1 ring-black/15 flex flex-col justify-between p-3",
        sizes[size],
        tiltClass,
        className
      )}
      style={{
        background: `linear-gradient(155deg, ${color} 0%, ${secondary} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/25" />
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-white/10 blur-xl" />

      <div className="relative z-10">
        <div className="inline-block rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
          Jendela Ilmu
        </div>
      </div>

      <div className="relative z-10">
        <h3
          className={cn(
            "font-serif font-bold leading-[1.15] text-white line-clamp-4 drop-shadow-md",
            size === "sm" ? "text-[13px]" : size === "lg" ? "text-xl" : "text-base"
          )}
        >
          {title}
        </h3>
        {author && (
          <p
            className={cn(
              "mt-1.5 text-white/75 line-clamp-1 font-medium",
              size === "sm" ? "text-[9px]" : "text-[11px]"
            )}
          >
            {author}
          </p>
        )}
      </div>
    </div>
  );
}

function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + Math.round((255 * percent) / 100)));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}
