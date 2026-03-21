"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { agents, activityLog, agentMessages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-400">Agente no encontrado</p>
        <Link href="/agents" className="mt-4 text-violet-400 hover:text-violet-300">
          ← Volver
        </Link>
      </div>
    );
  }

  const agentActivity = activityLog.filter((a) => a.agentId === agentId);
  const agentMsgs = agentMessages.filter(
    (m) => m.fromAgentId === agentId || m.toAgentId === agentId
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{agent.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Agente {agent.name}</h1>
              <p className="text-gray-500">{agent.description}</p>
            </div>
          </div>
          <span
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              agent.status === "active"
                ? "bg-green-400/10 text-green-400"
                : agent.status === "working"
                ? "bg-yellow-400/10 text-yellow-400"
                : "bg-gray-700/50 text-gray-400"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
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
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div className="rounded-xl border border-violet-800/50 bg-violet-600/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Tarea actual
          </p>
          <p className="mt-2 text-white">{agent.currentTask}</p>
          <p className="mt-2 text-xs text-gray-500">Última acción: {agent.lastActionTime}</p>
        </div>
      )}

      {/* Metrics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Métricas</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(agent.metrics).map(([key, val]) => (
            <div key={key} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500">{key}</p>
              <p className="mt-1 text-2xl font-bold text-white">{val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Activity log */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Historial de actividad</h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            {agentActivity.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-600">Sin actividad registrada</p>
            ) : (
              agentActivity.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    "p-4",
                    i !== agentActivity.length - 1 && "border-b border-gray-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs",
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
                    <p className="text-xs text-gray-600">
                      {new Date(entry.timestamp).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">{entry.description}</p>
                  {entry.linkedTask && (
                    <p className="mt-1 text-xs text-gray-600">📎 {entry.linkedTask}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent messages */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Mensajes entre agentes</h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            {agentMsgs.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-600">Sin mensajes</p>
            ) : (
              agentMsgs.map((msg, i) => {
                const isFrom = msg.fromAgentId === agentId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-4",
                      i !== agentMsgs.length - 1 && "border-b border-gray-800"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{msg.fromAgentEmoji} {msg.fromAgentName}</span>
                      <span>→</span>
                      <span>{msg.toAgentEmoji} {msg.toAgentName}</span>
                      <span className="ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-2 rounded-lg p-3 text-sm",
                        isFrom
                          ? "bg-violet-600/15 text-violet-100"
                          : "bg-gray-800 text-gray-300"
                      )}
                    >
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick nav to other agents */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Otros agentes</h2>
        <div className="flex flex-wrap gap-3">
          {agents
            .filter((a) => a.id !== agentId)
            .map((a) => (
              <Link
                key={a.id}
                href={`/agents/${a.id}`}
                className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-700 hover:text-gray-200"
              >
                <span>{a.emoji}</span>
                {a.name}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
