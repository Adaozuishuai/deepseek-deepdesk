export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fallthrough
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function makeTitle(text: string): string {
  const firstLine = text.split('\n')[0].trim()
  if (!firstLine) return '新对话'
  return firstLine.length > 32 ? firstLine.slice(0, 32) + '…' : firstLine
}

export function copyText(text: string): Promise<boolean> {
  return new Promise(resolve => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(() => resolve(fallbackCopy(text)))
    } else {
      resolve(fallbackCopy(text))
    }
  })
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}

export function normalizeBaseUrl(url: string): string {
  let base = url.trim()
  while (base.endsWith('/')) base = base.slice(0, -1)
  return base
}
