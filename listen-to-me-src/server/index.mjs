/**
 * Listen to Me — 本地 API
 * 提取 PDF / .docx 正文，供前端朗读列表使用。
 *
 * 启动：npm run dev:server
 * 联调：npm run dev:full（后端 + Vite，前端走 /api 代理）
 * 单机部署：npm run build && npm start（同一端口提供 API + 静态页面）
 */
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import mammoth from 'mammoth'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

/**
 * multipart 里的 originalname 常被当成 Latin1，UTF-8 中文会乱码（如 设计 → è®¡è®¡）。
 * 对已含中日韩等正确 Unicode 的文件名不再转换，避免误伤。
 */
function decodeUploadFilename(raw) {
  if (raw == null || raw === '') return '未命名'
  if (typeof raw !== 'string') return '未命名'
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/.test(raw)) {
    return raw
  }
  try {
    const utf8 = Buffer.from(raw, 'latin1').toString('utf8')
    if (utf8.includes('\uFFFD')) return raw
    return utf8
  } catch {
    return raw
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3042)

/** 单文件上限 1GB；内存解析大文件时请留意本机内存 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 ** 3, files: 32 },
})

const app = express()
app.disable('x-powered-by')
// CORS 配置：支持本地开发和生产环境
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : null

app.use(
  cors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动端、Postman）
      if (!origin) return callback(null, true)
      // 如果配置了白名单，检查是否在白名单中
      if (allowedOrigins) {
        const isAllowed = allowedOrigins.some((o) => origin.startsWith(o))
        if (!isAllowed) {
          console.warn(`CORS blocked: ${origin}`)
          return callback(new Error('Not allowed by CORS'), false)
        }
      }
      callback(null, true)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'listen-to-me',
    version: '1.0.0',
  })
})

app.post('/api/extract', upload.array('files', 32), async (req, res) => {
  const files = req.files
  if (!files?.length) {
    return res.status(400).json({
      error: '未收到文件。请使用 multipart 字段名 files。',
    })
  }

  /** @type {Array<{ ok: true, id: string, name: string, text: string } | { ok: false, name: string, error: string }>} */
  const items = []

  for (const file of files) {
    const name = decodeUploadFilename(file.originalname)
    const lower = name.toLowerCase()

    try {
      if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
        items.push({
          ok: false,
          name,
          error: '暂不支持旧版 .doc，请在 Word 中另存为 .docx',
        })
        continue
      }

      let text = ''
      if (lower.endsWith('.pdf') || file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer)
        text = (data.text || '').trim()
      } else if (
        lower.endsWith('.docx') ||
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const { value } = await mammoth.extractRawText({ buffer: file.buffer })
        text = (value || '').trim()
      } else {
        items.push({
          ok: false,
          name,
          error: '仅支持 PDF 或 Word（.docx）',
        })
        continue
      }

      if (!text) {
        items.push({
          ok: false,
          name,
          error: '未解析到文字（可能是扫描版 PDF）',
        })
        continue
      }

      items.push({
        ok: true,
        id: crypto.randomUUID(),
        name,
        text,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      items.push({ ok: false, name, error: message || '解析失败' })
    }
  }

  res.json({ items })
})

const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

// Railway 需要监听 0.0.0.0，本地开发可以用 127.0.0.1
const HOST = process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : '127.0.0.1'

app.listen(PORT, HOST, () => {
  console.log(`Listen to Me 后端: http://${HOST}:${PORT}/api/health`)
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log(`静态页面: http://${HOST}:${PORT}/`)
  }
})
