"use client";

import { AgentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AgentStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const statusConfig = {
  active: {
    label: "Activo",
    dotClass: "bg-green-400",
    badgeClass: "bg-green-400/10 text-green-400 border-green-400/20",
    pulseClass: "animate-pulse",
  },
  working: {
    label: "Trabajando",
    dotClass: "bg-yellow-400",
    badgeClass: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    pulseClass: "animate-pulse",
  },
  idle: {
    label: "Inactivo",
    dotClass: "bg-gray-500",
    badgeClass: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    pulseClass: "",
  },
};

export function StatusBadge({ status, showLabel = true, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
        config.badgeClass,
        size === "sm" ? "text-xs" : "text-xs"
      )}
    >
      <span
        className={cn(
          "rounded-full",
          config.dotClass,
          config.pulseClass,
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
      />
      {showLabel && config.label}
    </span>
  );
}
