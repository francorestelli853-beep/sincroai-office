"use client";

import Link from "next/link";
import { agents } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Agentes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todos los agentes del sistema SincroAI
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-violet-700/50 hover:bg-gray-800/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{agent.emoji}</span>
                <div>
                  <p className="text-lg font-semibold text-white">{agent.name}</p>
                  <p className="text-sm text-gray-500">{agent.description}</p>
                </div>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
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
                {agent.status === "active" ? "Activo" : agent.status === "working" ? "Trabajando" : "Inactivo"}
              </span>
            </div>
            {agent.currentTask && (
              <p className="mt-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
                {agent.currentTask}
              </p>
            )}
            <div className="mt-4 flex gap-4">
              {Object.entries(agent.metrics).slice(0, 3).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-600">{k}</p>
                  <p className="text-sm font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
