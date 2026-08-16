export interface ToolCallItem {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolCallResult {
  content: string | null
  toolCalls: ToolCallItem[]
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
}

export interface ToolCallRequest {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<Record<string, unknown>>
  tools: Array<Record<string, unknown>>
  temperature?: number
  signal?: AbortSignal
}

export async function chatCompletionWithTools(req: ToolCallRequest): Promise<ToolCallResult> {
  let base = req.baseUrl.trim()
  while (base.endsWith('/')) base = base.slice(0, -1)
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + req.apiKey
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      tools: req.tools,
      temperature: req.temperature ?? 1,
      stream: false
    }),
    signal: req.signal
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.text()).slice(0, 600)
    } catch {
      detail = ''
    }
    throw new Error('HTTP ' + res.status + ': ' + (detail || res.statusText))
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  }
  const msg: { content?: unknown; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } = (json.choices && json.choices[0] && json.choices[0].message) || {}
  const rawCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : []
  const toolCalls: ToolCallItem[] = rawCalls.map(c => {
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(c.function && c.function.arguments ? c.function.arguments : '{}')
    } catch {
      args = {}
    }
    return {
      id: c.id ?? ('call-' + Math.random().toString(36).slice(2)),
      name: (c.function && c.function.name) || '',
      args
    }
  })
  const content = typeof msg.content === 'string' ? msg.content : null
  const usage = json.usage ? { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens, totalTokens: json.usage.total_tokens } : undefined
  return { content, toolCalls, usage }
}
