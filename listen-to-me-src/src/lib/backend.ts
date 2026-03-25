export type ExtractItem =
  | { ok: true; id: string; name: string; text: string }
  | { ok: false; name: string; error: string }

/** 空字符串表示同源（开发模式下走 Vite /api 代理或生产构建由 Node 同端口托管） */
export function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
}

export async function fetchHealth(): Promise<boolean> {
  const base = apiBase()
  const url = `${base}/api/health`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2800)
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    return r.ok
  } catch {
    return false
  }
}

/** 请求成功返回条目列表；后端不可用时返回 null，由前端自行解析 */
export async function extractOnServer(files: File[]): Promise<ExtractItem[] | null> {
  const base = apiBase()
  const url = `${base}/api/extract`
  const form = new FormData()
  for (const f of files) form.append('files', f)
  try {
    const r = await fetch(url, { method: 'POST', body: form })
    if (!r.ok) return null
    const data = (await r.json()) as { items?: ExtractItem[] }
    if (!Array.isArray(data.items)) return null
    return data.items
  } catch {
    return null
  }
}
