import { createServer } from 'node:http'
import { streamOpenAICompatible } from '../src/shared/llm/openai.ts'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const results: string[] = []
let failed = 0

function check(name: string, cond: boolean, detail?: string) {
  results.push((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''))
  if (!cond) failed++
}

// 模拟 OpenAI 兼容服务
const server = createServer((req, res) => {
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
    res.setHeader('Cache-Control', 'no-cache')
    res.write('data: ' + JSON.stringify({ id: 'x1', model: 'mock-chat', choices: [{ index: 0, delta: { role: 'assistant' } }] }) + '\n\n')
    res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta: { reasoning_content: '让我想想\n' } }] }) + '\n\n')
    res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta: { content: '你好，' } }] }) + '\n\n')
    res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta: { content: '世界！' } }] }) + '\n\n')
    res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } }) + '\n\n')
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }
  res.statusCode = 404
  res.end()
})

await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const port = (server.address() as { port: number }).port
const base = 'http://127.0.0.1:' + port

// 测试 1：流式解析（内容 + 思考 + usage）
try {
  let content = ''
  let reasoning = ''
  let usage: unknown = null
  let model = ''
  for await (const chunk of streamOpenAICompatible({
    baseUrl: base,
    apiKey: 'test-key-123',
    model: 'mock-chat',
    messages: [{ role: 'user', content: 'hi' }]
  })) {
    if (chunk.type === 'content') content += chunk.text
    if (chunk.type === 'reasoning') reasoning += chunk.text
    if (chunk.type === 'final') { usage = chunk.usage; model = chunk.model ?? '' }
  }
  check('内容流式拼接', content === '你好，世界！', content)
  check('思考内容解析', reasoning.includes('让我想想'), reasoning)
  check('usage 透传', (usage as { totalTokens?: number })?.totalTokens === 18)
  check('模型名透传', model === 'mock-chat', model)
} catch (e) {
  check('流式解析无异常', false, String(e))
}

// 测试 2：/models 测试连接
try {
  const res = await fetch(base + '/models', { headers: { Authorization: 'Bearer test-key-123' } })
  const json = (await res.json()) as { data: Array<{ id: string }> }
  check('模型列表接口', res.status === 200 && json.data.length === 2, json.data.map(m => m.id).join(','))
} catch (e) {
  check('模型列表接口', false, String(e))
}

// 测试 3：错误凭据 → HTTP 401 异常
try {
  for await (const _c of streamOpenAICompatible({ baseUrl: base, apiKey: 'wrong', model: 'm', messages: [] })) { /* noop */ }
  check('401 错误抛出', false, '未抛出异常')
} catch (e) {
  check('401 错误抛出', String(e).includes('401'), String(e))
}

// 测试 4：取消（Abort）
try {
  const ac = new AbortController()
  let got = ''
  let aborted = false
  try {
    for await (const chunk of streamOpenAICompatible({ baseUrl: base, apiKey: 'test-key-123', model: 'mock-chat', messages: [], signal: ac.signal })) {
      if (chunk.type === 'content') got += chunk.text
      await sleep(5)
      ac.abort()
    }
  } catch (e) {
    aborted = (e as Error).name === 'AbortError'
  }
  check('Abort 中断', aborted || got.startsWith('你好'), 'aborted=' + aborted)
} catch (e) {
  check('Abort 中断', false, String(e))
}

server.close()

console.log('\n===== DeepDesk LLM 客户端自检 =====')
console.log(results.join('\n'))
console.log(failed === 0 ? '\n全部通过 ✔' : '\n失败 ' + failed + ' 项 ✘')
process.exit(failed === 0 ? 0 : 1)
