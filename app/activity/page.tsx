"use client";

import { useState } from "react";
import { activityLog, agentMessages } from "@/lib/mock-data";
import { ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeColors: Record<ActivityType, string> = {
  action: "bg-blue-400/10 text-blue-400",
  message: "bg-violet-400/10 text-violet-400",
  task: "bg-green-400/10 text-green-400",
  alert: "bg-red-400/10 text-red-400",
};

const agentFilters = [
  { id: "todos", label: "Todos" },
  { id: "outreach", label: "🎯 Outreach" },
  { id: "ventas", label: "🤝 Ventas" },
  { id: "onboarding", label: "⚙️ Onboarding" },
  { id: "web-builder", label: "🌐 Web Builder" },
  { id: "reportes", label: "📊 Reportes" },
  { id: "soporte", label: "🛠️ Soporte" },
];

const typeFilters: { id: ActivityType | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "action", label: "Acción" },
  { id: "message", label: "Mensaje" },
  { id: "task", label: "Tarea" },
  { id: "alert", label: "Alerta" },
];

export default function ActivityPage() {
  const [agentFilter, setAgentFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "todos">("todos");
  const [view, setView] = useState<"log" | "messages">("log");

  const filtered = activityLog.filter((e) => {
    if (agentFilter !== "todos" && e.agentId !== agentFilter) return false;
    if (typeFilter !== "todos" && e.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Actividad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Log completo de acciones e inter-comunicación entre agentes
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("log")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            view === "log"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          )}
        >
          📋 Log de actividad
        </button>
        <button
          onClick={() => setView("messages")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            view === "messages"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          )}
        >
          💬 Mensajes entre agentes
        </button>
      </div>

      {view === "log" && (
        <>
          {/* Filters */}
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs text-gray-500">Filtrar por agente</p>
              <div className="flex flex-wrap gap-2">
                {agentFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setAgentFilter(f.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      agentFilter === f.id
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500">Filtrar por tipo</p>
              <div className="flex flex-wrap gap-2">
                {typeFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id as ActivityType | "todos")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      typeFilter === f.id
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-600">
                No hay actividad con los filtros seleccionados
              </p>
            ) : (
              filtered.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-4 p-4",
                    i !== filtered.length - 1 && "border-b border-gray-800"
                  )}
                >
                  <span className="mt-0.5 text-xl">{entry.agentEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{entry.agentName}</span>
                      {entry.toAgentName && (
                        <>
                          <span className="text-xs text-gray-600">→</span>
                          <span className="text-sm text-gray-400">
                            {entry.toAgentEmoji} {entry.toAgentName}
                          </span>
                        </>
                      )}
                      <span className={cn("rounded px-2 py-0.5 text-xs", typeColors[entry.type])}>
                        {entry.type}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-gray-300">{entry.description}</p>
                    {entry.linkedTask && (
                      <p className="mt-1 text-xs text-gray-600">📎 {entry.linkedTask}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-gray-600">
                    {new Date(entry.timestamp).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === "messages" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Conversaciones directas entre agentes — así se coordinan entre sí
          </p>
          {agentMessages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5">
                    <span>{msg.fromAgentEmoji}</span>
                    <span className="text-sm font-medium text-white">{msg.fromAgentName}</span>
                  </div>
                  <span className="text-gray-600">→</span>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5">
                    <span>{msg.toAgentEmoji}</span>
                    <span className="text-sm font-medium text-white">{msg.toAgentName}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {new Date(msg.timestamp).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="mt-3 rounded-lg bg-violet-600/10 border border-violet-800/30 p-4">
                <p className="text-sm text-gray-200">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
