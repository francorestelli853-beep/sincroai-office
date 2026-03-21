"use client";

import Link from "next/link";
import { Agent, ActivityEntry } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { ArrowRight, Clock } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  recentActivity: ActivityEntry[];
}

export function AgentCard({ agent, recentActivity }: AgentCardProps) {
  const agentActivity = recentActivity
    .filter((a) => a.agentId === agent.id)
    .slice(0, 2);

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700 hover:bg-gray-900/80">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-2xl">
            {agent.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-gray-500">{agent.description}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Current Task */}
      <div className="mb-4 flex-1">
        {agent.currentTask ? (
          <div className="rounded-lg bg-gray-800/60 px-3 py-2.5">
            <p className="text-xs font-medium text-gray-400 mb-1">Tarea actual</p>
            <p className="text-sm text-gray-200 leading-relaxed">{agent.currentTask}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-800/30 px-3 py-2.5">
            <p className="text-xs text-gray-600 italic">Sin tarea activa</p>
          </div>
        )}
      </div>

      {/* Recent Actions */}
      {agentActivity.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {agentActivity.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-600" />
              <p className="line-clamp-1 text-xs text-gray-500">{entry.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock className="h-3 w-3" />
          <span>{agent.lastActionTime}</span>
        </div>
        <Link
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-violet-600/20 hover:text-violet-400"
        >
          Ver detalle
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
