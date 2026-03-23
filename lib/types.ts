export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline'

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type MessageType = 'agent-to-agent' | 'user-to-agent' | 'system'

export interface Agent {
  id: string
  name: string
  role: string
  personality: string
  status: AgentStatus
  tools: string[]
  objective: string
  avatar: string
  lastActive: Date
}

export interface Task {
  id: string
  title: string
  description: string
  assignedTo: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: Date
  completedAt: Date | null
  subtasks: string[]
}

export interface Message {
  id: string
  fromAgent: string
  toAgent: string
  content: string
  timestamp: Date
  type: MessageType
}

export interface ActivityLog {
  id: string
  agentId: string
  agentName: string
  action: string
  details: string
  timestamp: Date
  category: 'task' | 'communication' | 'system' | 'error'
}
