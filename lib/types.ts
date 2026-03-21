export type AgentStatus = "active" | "working" | "idle";

export type ActivityType = "action" | "message" | "task" | "alert";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: AgentStatus;
  currentTask: string | null;
  lastActionTime: string;
  metrics: Record<string, number | string>;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  type: ActivityType;
  description: string;
  linkedTask?: string;
  toAgentId?: string;
  toAgentName?: string;
  toAgentEmoji?: string;
}

export interface Lead {
  id: string;
  clinicName: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  stage: "prospecto" | "contactado" | "calificado" | "negociacion" | "cliente";
  assignedAgent: string;
  lastContact: string;
  notes: string;
}

export interface Command {
  id: string;
  timestamp: string;
  targetAgent: string | "todos";
  command: string;
  status: "enviado" | "procesando" | "completado" | "error";
}

export interface AgentMessage {
  id: string;
  timestamp: string;
  fromAgentId: string;
  fromAgentName: string;
  fromAgentEmoji: string;
  toAgentId: string;
  toAgentName: string;
  toAgentEmoji: string;
  message: string;
}
