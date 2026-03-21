"use client";

import { useState } from "react";
import { agents, commandHistory } from "@/lib/mock-data";
import { Command } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

const quickCommands = [
  "Buscar prospectos hoy en CABA y Bogotá",
  "Generar reporte semanal de actividad",
  "Revisar leads fríos y enviar follow-up",
  "Verificar integraciones de todos los clientes",
  "Resumir el pipeline actual",
];

export default function ControlPage() {
  const [command, setCommand] = useState("");
  const [targetAgent, setTargetAgent] = useState("todos");
  const [history, setHistory] = useState<Command[]>(commandHistory);

  const handleSend = () => {
    if (!command.trim()) return;
    const newCmd: Command = {
      id: `cmd-${Date.now()}`,
      timestamp: new Date().toISOString(),
      targetAgent,
      command: command.trim(),
      status: "enviado",
    };
    setHistory([newCmd, ...history]);
    setCommand("");

    // Simulate status change
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((c) =>
          c.id === newCmd.id ? { ...c, status: "procesando" } : c
        )
      );
    }, 800);
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((c) =>
          c.id === newCmd.id ? { ...c, status: "completado" } : c
        )
      );
    }, 3000);
  };

  const agentLabel = (id: string) => {
    if (id === "todos") return "🤖 Todos los agentes";
    const a = agents.find((ag) => ag.id === id);
    return a ? `${a.emoji} ${a.name}` : id;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Centro de Control</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enviá órdenes directas a los agentes y monitoreá el progreso
        </p>
      </div>

      {/* Command Input */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Nueva orden
        </h2>

        {/* Target selector */}
        <div className="mb-4">
          <label className="mb-2 block text-xs text-gray-500">Destinatario</label>
          <div className="flex flex-wrap gap-2">
            {["todos", ...agents.map((a) => a.id)].map((id) => {
              const a = agents.find((ag) => ag.id === id);
              return (
                <button
                  key={id}
                  onClick={() => setTargetAgent(id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    targetAgent === id
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                  )}
                >
                  {id === "todos" ? "🤖 Todos" : `${a?.emoji} ${a?.name}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Command textarea */}
        <div className="relative">
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Escribí una orden para ${agentLabel(targetAgent)}...`}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!command.trim()}
            className="absolute bottom-3 right-3 rounded-lg bg-violet-600 p-2 text-white transition-colors hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">Enter para enviar · Shift+Enter para nueva línea</p>

        {/* Quick commands */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-gray-600">Comandos rápidos:</p>
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((qc) => (
              <button
                key={qc}
                onClick={() => setCommand(qc)}
                className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-violet-600/50 hover:text-violet-400"
              >
                {qc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Command History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Historial de comandos</h2>
        <div className="space-y-3">
          {history.map((cmd) => (
            <div
              key={cmd.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-violet-400">
                      → {agentLabel(cmd.targetAgent)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        cmd.status === "completado"
                          ? "bg-green-400/10 text-green-400"
                          : cmd.status === "procesando"
                          ? "bg-yellow-400/10 text-yellow-400"
                          : cmd.status === "enviado"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-red-400/10 text-red-400"
                      )}
                    >
                      {cmd.status === "procesando" && "⟳ "}
                      {cmd.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-300">{cmd.command}</p>
                </div>
                <p className="shrink-0 text-xs text-gray-600">
                  {new Date(cmd.timestamp).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
