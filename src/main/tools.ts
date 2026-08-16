import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AgentToolCall, AgentToolResult } from '../shared/agent-types'

const MAX_OUTPUT = 20000

export function resolveInWorkdir(workdir: string, p: string): string {
  const abs = path.isAbsolute(p) ? path.normalize(p) : path.resolve(workdir, p)
  const wd = path.resolve(workdir)
  const rel = path.relative(wd, abs)
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    throw new Error('路径超出工作目录范围: ' + p)
  }
  return abs
}

function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT) return s
  return s.slice(0, MAX_OUTPUT) + '\n...（输出过长已截断）'
}

function execShell(command: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    exec(command, { cwd, shell: 'powershell.exe', timeout: 120000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? ''), code })
    })
  })
}

export async function executeTool(call: AgentToolCall, workdir: string): Promise<AgentToolResult> {
  const a = call.args
  switch (call.name) {
    case 'run_command': {
      const command = String(a.command ?? '')
      if (!command.trim()) return { ok: false, content: '命令为空', summary: '命令为空' }
      const cwd = a.cwd ? resolveInWorkdir(workdir, String(a.cwd)) : workdir
      const r = await execShell(command, cwd)
      const content = (r.stdout ? truncate(r.stdout) + '\n' : '') + (r.stderr ? '[stderr]\n' + truncate(r.stderr) + '\n' : '') + '[exit code: ' + r.code + ']'
      return { ok: r.code === 0, content, summary: command }
    }
    case 'read_file': {
      const p = resolveInWorkdir(workdir, String(a.path ?? ''))
      const raw = await fs.readFile(p, 'utf-8')
      const lines = raw.split('\n')
      const numbered = lines.map((l, i) => (i + 1) + ': ' + l).join('\n')
      return { ok: true, content: truncate(numbered), summary: path.basename(p) }
    }
    case 'write_file': {
      const p = resolveInWorkdir(workdir, String(a.path ?? ''))
      const content = String(a.content ?? '')
      await fs.mkdir(path.dirname(p), { recursive: true })
      await fs.writeFile(p, content, 'utf-8')
      return { ok: true, content: '已写入 ' + p + '（' + content.length + ' 字符）', summary: '写入 ' + path.basename(p) }
    }
    case 'edit_file': {
      const p = resolveInWorkdir(workdir, String(a.path ?? ''))
      const oldStr = String(a.old_string ?? '')
      const newStr = String(a.new_string ?? '')
      const raw = await fs.readFile(p, 'utf-8')
      const count = raw.split(oldStr).length - 1
      if (count === 0) return { ok: false, content: '未找到要替换的文本', summary: '未找到替换文本' }
      if (count > 1) return { ok: false, content: '要替换的文本出现 ' + count + ' 次，请提供更精确的上下文', summary: '替换文本不唯一' }
      const updated = raw.replace(oldStr, newStr)
      await fs.writeFile(p, updated, 'utf-8')
      return { ok: true, content: '已替换 ' + path.basename(p) + ' 中的 1 处文本', summary: '编辑 ' + path.basename(p) }
    }
    case 'list_files': {
      const p = a.path ? resolveInWorkdir(workdir, String(a.path)) : workdir
      const entries = await fs.readdir(p, { withFileTypes: true })
      const lines = entries.map(e => (e.isDirectory() ? '[目录] ' : '       ') + e.name)
      return { ok: true, content: lines.join('\n') || '（空目录）', summary: '列出 ' + entries.length + ' 项' }
    }
    case 'search_content': {
      const pattern = String(a.pattern ?? '')
      const root = a.path ? resolveInWorkdir(workdir, String(a.path)) : workdir
      const matches: string[] = []
      const walk = async (dir: string): Promise<void> => {
        let entries
        try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
        for (const e of entries) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'out') continue
            await walk(full)
          } else if (e.isFile()) {
            try {
              const txt = await fs.readFile(full, 'utf-8')
              if (txt.includes(pattern)) {
                const ls = txt.split('\n')
                ls.forEach((l, i) => { if (l.includes(pattern)) matches.push(full + ':' + (i + 1) + ': ' + l.trim().slice(0, 200)) })
              }
            } catch { /* 跳过二进制 */ }
          }
        }
      }
      await walk(root)
      const content = matches.slice(0, 200).join('\n') || '未找到匹配内容'
      return { ok: true, content: truncate(content), summary: matches.length + ' 处匹配' }
    }
    default:
      return { ok: false, content: '未知工具: ' + call.name, summary: '未知工具' }
  }
}

export function isDangerousCommand(command: string): boolean {
  const c = command.toLowerCase()
  const patterns = ['rm -rf', 'rd /s /q', 'del /f /s /q', 'format ', 'shutdown', 'restart-computer', 'stop-computer', 'remove-item -recurse -force', 'drop table', 'deltree', 'diskpart']
  return patterns.some(p => c.includes(p))
}
