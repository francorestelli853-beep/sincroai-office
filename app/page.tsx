"use client";

import Link from "next/link";
import { agents, activityLog, quickStats } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const recentActivity = activityLog.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estado en tiempo real de todos los agentes SincroAI
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Leads hoy" value={quickStats.leadsHoy} color="text-violet-400" />
        <StatCard label="Emails enviados" value={quickStats.emailsEnviados} color="text-blue-400" />
        <StatCard label="Tareas completadas" value={quickStats.tareasCompletadas} color="text-green-400" />
        <StatCard label="Clientes activos" value={quickStats.clientesActivos} color="text-yellow-400" />
      </div>

      {/* Agents Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Agentes</h2>
        <div className="grid grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div>
                    <p className="font-semibold text-white">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.description}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    agent.status === "active"
                      ? "bg-green-400/10 text-green-400"
                      : agent.status === "working"
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-gray-700/50 text-gray-400"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      agent.status === "active"
                        ? "bg-green-400"
                        : agent.status === "working"
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-gray-500"
                    )}
                  />
                  {agent.status === "active"
                    ? "Activo"
                    : agent.status === "working"
                    ? "Trabajando"
                    : "Inactivo"}
                </span>
              </div>

              <div className="mt-4">
                {agent.currentTask ? (
                  <p className="text-sm text-gray-300">{agent.currentTask}</p>
                ) : (
                  <p className="text-sm text-gray-600 italic">Sin tarea activa</p>
                )}
                <p className="mt-2 text-xs text-gray-600">Última acción: {agent.lastActionTime}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                <div className="flex gap-3">
                  {Object.entries(agent.metrics)
                    .slice(0, 2)
                    .map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs text-gray-500">{key}</p>
                        <p className="text-sm font-medium text-white">{val}</p>
                      </div>
                    ))}
                </div>
                <Link
                  href={`/agents/${agent.id}`}
                  className="rounded-lg bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-600/25"
                >
                  Ver detalle →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Actividad reciente</h2>
          <Link href="/activity" className="text-xs text-violet-400 hover:text-violet-300">
            Ver todo →
          </Link>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          {recentActivity.map((entry, i) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-4 p-4",
                i !== recentActivity.length - 1 && "border-b border-gray-800"
              )}
            >
              <span className="mt-0.5 text-lg">{entry.agentEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{entry.agentName}</span>
                  {entry.toAgentName && (
                    <>
                      <span className="text-xs text-gray-600">→</span>
                      <span className="text-sm text-gray-400">
                        {entry.toAgentEmoji} {entry.toAgentName}
                      </span>
                    </>
                  )}
                  <span
                    className={cn(
                      "ml-auto rounded px-2 py-0.5 text-xs",
                      entry.type === "action"
                        ? "bg-blue-400/10 text-blue-400"
                        : entry.type === "message"
                        ? "bg-violet-400/10 text-violet-400"
                        : entry.type === "task"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-red-400/10 text-red-400"
                    )}
                  >
                    {entry.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{entry.description}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
