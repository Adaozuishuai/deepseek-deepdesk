export type AgentToolName = 'run_command' | 'read_file' | 'write_file' | 'edit_file' | 'list_files' | 'search_content'

export interface AgentToolCall {
  id: string
  name: AgentToolName
  args: Record<string, unknown>
}

export interface AgentRunRequest {
  runId: string
  providerId: string
  modelId: string
  workdir: string
  task: string
  temperature: number
}

export interface AgentToolResult {
  ok: boolean
  content: string
  summary: string
}

export type AgentEventType = 'thinking' | 'text' | 'tool_call' | 'tool_result' | 'approval_request' | 'done' | 'error'

export interface AgentEvent {
  runId: string
  type: AgentEventType
  text?: string
  message?: string
  call?: AgentToolCall
  callId?: string
  summary?: string
  output?: string
  ok?: boolean
  command?: string
  cwd?: string
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
}

export type AgentStepKind = 'task' | 'thinking' | 'text' | 'tool' | 'error'

export interface AgentStep {
  kind: AgentStepKind
  text?: string
  callId?: string
  name?: string
  args?: string
  status?: 'running' | 'ok' | 'error' | 'denied'
  summary?: string
  result?: string
  message?: string
}
