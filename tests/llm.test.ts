import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { streamOpenAICompatible } from '../src/shared/llm/openai'
import { streamChatCompletionWithTools } from '../src/shared/llm/toolcall'

let server: Server
let base = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    const auth = req.headers['authorization'] ?? ''
    if (auth !== 'Bearer test-key-123') {
      res.statusCode = 401
      res.end(JSON.stringify({ error: { message: 'bad key' } }))
      return
    }
    if (req.url === '/models') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [{ id: 'mock-chat' }, { id: 'mock-reason' }] }))
      return
    }
    if (req.url === '/chat/completions') {
      res.setHeader('Content-Type', 'text/event-stream')
      const sse = (obj: unknown): string => 'data: ' + JSON.stringify(obj) + '\n\n'
      res.write(sse({ id: 'x1', model: 'mock-chat', choices: [{ index: 0, delta: { role: 'assistant' } }] }))
      res.write(sse({ choices: [{ index: 0, delta: { reasoning_content: '让我想想\n' } }] }))
      res.write(sse({ choices: [{ index: 0, delta: { content: '你好，' } }] }))
      res.write(sse({ choices: [{ index: 0, delta: { content: '世界！' } }] }))
      res.write(sse({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } }))
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    res.statusCode = 404
    res.end()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = 'http://127.0.0.1:' + (server.address() as { port: number }).port
})

afterAll(() => { server.close() })

describe('streamOpenAICompatible', () => {
  it('流式解析内容、思考、usage 与模型名', async () => {
    let content = ''
    let reasoning = ''
    let usage: { totalTokens?: number } | null = null
    let model = ''
    for await (const chunk of streamOpenAICompatible({ baseUrl: base, apiKey: 'test-key-123', model: 'mock-chat', messages: [{ role: 'user', content: 'hi' }] })) {
      if (chunk.type === 'content') content += chunk.text
      if (chunk.type === 'reasoning') reasoning += chunk.text
      if (chunk.type === 'final') { usage = chunk.usage ?? null; model = chunk.model ?? '' }
    }
    expect(content).toBe('你好，世界！')
    expect(reasoning).toContain('让我想想')
    expect(usage?.totalTokens).toBe(18)
    expect(model).toBe('mock-chat')
  })

  it('错误凭据抛 401 并携带详情', async () => {
    await expect(async () => {
      for await (const _c of streamOpenAICompatible({ baseUrl: base, apiKey: 'wrong', model: 'm', messages: [] })) { /* noop */ }
    }).rejects.toThrow('401')
  })

  it('AbortSignal 可中断流', async () => {
    const slow = createServer((_req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta: { content: '开始' } }] }) + '\n\n')
      // 保持连接，不再写入，模拟长时间生成
    })
    await new Promise<void>(r => slow.listen(0, '127.0.0.1', r))
    const slowBase = 'http://127.0.0.1:' + (slow.address() as { port: number }).port
    const ac = new AbortController()
    let aborted = false
    try {
      for await (const chunk of streamOpenAICompatible({ baseUrl: slowBase, apiKey: 'x', model: 'm', messages: [], signal: ac.signal })) {
        if (chunk.type === 'content') ac.abort()
      }
    } catch (e) {
      aborted = (e as Error).name === 'AbortError'
    } finally {
      slow.close()
    }
    expect(aborted).toBe(true)
  })
})

describe('streamChatCompletionWithTools', () => {
  let s2: Server
  let base2 = ''

  beforeAll(async () => {
    const sse = (obj: unknown): string => 'data: ' + JSON.stringify(obj) + '\n\n'
    s2 = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      if (req.url === '/tools/chat/completions') {
        res.write(sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'write_file', arguments: '' } }] } }] }))
        res.write(sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"path":"a.txt"' } }] } }] }))
        res.write(sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: ',"content":"hi"}' } }] } }] }))
        res.write(sse({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 5, completion_tokens: 12, total_tokens: 17 } }))
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
      if (req.url === '/plain/chat/completions') {
        res.write(sse({ choices: [{ index: 0, delta: { content: '流式' } }] }))
        res.write(sse({ choices: [{ index: 0, delta: { content: '输出' } }] }))
        res.write(sse({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }))
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
      res.statusCode = 404
      res.end()
    })
    await new Promise<void>(r => s2.listen(0, '127.0.0.1', r))
    base2 = 'http://127.0.0.1:' + (s2.address() as { port: number }).port
  })

  afterAll(() => { s2.close() })

  it('按 index 累积 tool_calls 增量并解析参数', async () => {
    let content = ''
    let toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []
    let usage: { totalTokens?: number } | undefined
    for await (const chunk of streamChatCompletionWithTools({ baseUrl: base2 + '/tools', apiKey: 'k', model: 'm', messages: [], tools: [] })) {
      if (chunk.type === 'content') content += chunk.text
      else { toolCalls = chunk.toolCalls; usage = chunk.usage }
    }
    expect(content).toBe('')
    expect(toolCalls).toHaveLength(1)
    expect(toolCalls[0]).toMatchObject({ id: 'call_1', name: 'write_file', args: { path: 'a.txt', content: 'hi' } })
    expect(usage?.totalTokens).toBe(17)
  })

  it('纯文本流式增量并返回空工具调用', async () => {
    let content = ''
    let toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []
    for await (const chunk of streamChatCompletionWithTools({ baseUrl: base2 + '/plain', apiKey: 'k', model: 'm', messages: [], tools: [] })) {
      if (chunk.type === 'content') content += chunk.text
      else toolCalls = chunk.toolCalls
    }
    expect(content).toBe('流式输出')
    expect(toolCalls).toHaveLength(0)
  })
})
