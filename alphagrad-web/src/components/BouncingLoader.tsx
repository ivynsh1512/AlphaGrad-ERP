import React from "react";

interface BouncingLoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  color?: "indigo" | "emerald" | "amber" | "slate";
  className?: string;
  minHeight?: string;
}

export default function BouncingLoader({
  text = "Loading data...",
  size = "md",
  color = "indigo",
  className = "",
  minHeight = "min-h-[160px]",
}: BouncingLoaderProps) {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const dotColors = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    slate: "bg-slate-600",
  };

  const textColors = {
    indigo: "text-indigo-900/80",
    emerald: "text-emerald-900/80",
    amber: "text-amber-900/80",
    slate: "text-slate-600",
  };

  const bgTints = {
    indigo: "bg-indigo-50/40 border-indigo-100/60",
    emerald: "bg-emerald-50/40 border-emerald-100/60",
    amber: "bg-amber-50/40 border-amber-100/60",
    slate: "bg-slate-50/60 border-slate-100",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 rounded-2xl border ${bgTints[color]} ${minHeight} ${className}`}
    >
      {/* 3 Bouncing Dots */}
      <div className="flex items-center space-x-2">
        <span
          className={`${dotSizes[size]} ${dotColors[color]} rounded-full animate-bounce [animation-delay:-0.3s] shadow-xs`}
        />
        <span
          className={`${dotSizes[size]} ${dotColors[color]} rounded-full animate-bounce [animation-delay:-0.15s] shadow-xs`}
        />
        <span
          className={`${dotSizes[size]} ${dotColors[color]} rounded-full animate-bounce shadow-xs`}
        />
      </div>

      {text && (
        <p className={`mt-3 text-xs font-semibold tracking-wide ${textColors[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
}
