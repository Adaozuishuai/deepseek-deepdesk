export const AGENT_TOOLS: Array<Record<string, unknown>> = [
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: '在用户电脑上执行一条 PowerShell 命令，返回标准输出、错误与退出码。优先用只读命令了解现状。',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: '要执行的命令' },
          cwd: { type: 'string', description: '可选，命令的工作目录（相对或绝对路径，需在工作目录内）' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文件内容（带行号）',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径（相对或绝对，需在工作目录内）' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '创建或覆盖一个文件',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: '精准替换文件中唯一出现的一段文本',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出目录内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '目录路径，默认工作目录' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: '在文件中递归搜索文本，返回匹配行（带行号）',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string', description: '搜索范围（文件或目录），默认工作目录' }
        },
        required: ['pattern']
      }
    }
  }
]
