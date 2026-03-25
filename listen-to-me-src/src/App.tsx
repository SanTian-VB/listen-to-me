import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconFileText,
  IconGripVertical,
  IconListOrdered,
  IconPause,
  IconPlay,
  IconRepeat,
  IconSkipForward,
  IconSquare,
  IconTrash2,
  IconUpload,
  IconVolume2,
} from './icons'
import { extractOnServer, fetchHealth } from './lib/backend'
import { extractDocumentText } from './lib/clientExtract'

type ReaderDoc = {
  id: string
  name: string
  text: string
}

/** 单文件最大体积（与后端 Multer 一致） */
const MAX_FILE_BYTES = 1024 ** 3

function splitTextForTts(text: string, maxChunk = 220): string[] {
  const t = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!t) return []
  const pieces = t.split(/(?<=[。！？!?])\s+|(?<=\n)/).filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  for (const p of pieces) {
    const next = cur ? `${cur}${p}` : p
    if (next.length <= maxChunk) {
      cur = next
    } else {
      if (cur) chunks.push(cur)
      if (p.length <= maxChunk) {
        cur = p
      } else {
        for (let i = 0; i < p.length; i += maxChunk) {
          chunks.push(p.slice(i, i + maxChunk))
        }
        cur = ''
      }
    }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [t.slice(0, 8000)]
}

export default function App() {
  const [docs, setDocs] = useState<ReaderDoc[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parseBusy, setParseBusy] = useState(false)

  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceUri, setVoiceUri] = useState('')

  const [loopList, setLoopList] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  /** null = 尚未检测，true / false = 本机 /api/health 是否可用 */
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [dropHighlight, setDropHighlight] = useState(false)
  const dropDepthRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceInitRef = useRef(false)

  const playRef = useRef({
    docIdx: 0,
    chunkIdx: 0,
    chunks: [] as string[],
    stopped: true,
  })

  /** onend 异步触发时需调用「当前」speakNextChunk，否则会卡在旧闭包里的音色/语速 */
  const speakNextChunkRef = useRef<() => void>(() => {})

  const refreshVoices = useCallback(() => {
    const v = window.speechSynthesis.getVoices()
    setVoices(v)
    if (!voiceInitRef.current && v.length) {
      voiceInitRef.current = true
      const zh =
        v.find((x) => /zh|cn|mandarin|Chinese/i.test(x.lang)) ??
        v.find((x) => x.lang.startsWith('zh')) ??
        v[0]
      if (zh) setVoiceUri(`${zh.voiceURI}::${zh.lang}`)
    }
  }, [])

  useEffect(() => {
    refreshVoices()
    window.speechSynthesis.onvoiceschanged = refreshVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [refreshVoices])

  const resolveVoice = useCallback((): SpeechSynthesisVoice | null => {
    const v = window.speechSynthesis.getVoices()
    if (!voiceUri) return v.find((x) => /zh/i.test(x.lang)) ?? v[0] ?? null
    const [uri, lang] = voiceUri.split('::')
    return v.find((x) => x.voiceURI === uri && x.lang === lang) ?? v.find((x) => x.voiceURI === uri) ?? null
  }, [voiceUri])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopSpeech = useCallback(() => {
    playRef.current.stopped = true
    playRef.current.chunks = []
    playRef.current.chunkIdx = 0
    window.speechSynthesis.cancel()
    clearTimer()
    setStatus('idle')
  }, [clearTimer])

  const startTimerIfNeeded = useCallback(() => {
    clearTimer()
    if (timerMinutes <= 0) return
    timerRef.current = setTimeout(
      () => {
        stopSpeech()
        timerRef.current = null
      },
      timerMinutes * 60 * 1000,
    )
  }, [timerMinutes, clearTimer, stopSpeech])

  const speakNextChunk = useCallback(() => {
    const pr = playRef.current
    if (pr.stopped) return

    const doc = docs[pr.docIdx]
    if (!doc || pr.chunkIdx >= pr.chunks.length) {
      const hasNext = pr.docIdx < docs.length - 1
      if (hasNext) {
        pr.docIdx += 1
        pr.chunks = splitTextForTts(docs[pr.docIdx].text)
        pr.chunkIdx = 0
        setCurrentIndex(pr.docIdx)
        if (!pr.chunks.length) {
          speakNextChunkRef.current()
          return
        }
      } else if (loopList && docs.length > 0) {
        pr.docIdx = 0
        pr.chunks = splitTextForTts(docs[0].text)
        pr.chunkIdx = 0
        setCurrentIndex(0)
        if (!pr.chunks.length) {
          stopSpeech()
          return
        }
      } else {
        stopSpeech()
        return
      }
    }

    const chunk = playRef.current.chunks[playRef.current.chunkIdx]
    if (!chunk) {
      stopSpeech()
      return
    }

    const u = new SpeechSynthesisUtterance(chunk)
    const voice = resolveVoice()
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'zh-CN'
    u.rate = rate
    u.pitch = pitch
    u.volume = volume

    u.onend = () => {
      if (playRef.current.stopped) return
      playRef.current.chunkIdx += 1
      speakNextChunkRef.current()
    }
    u.onerror = () => {
      if (playRef.current.stopped) return
      playRef.current.chunkIdx += 1
      speakNextChunkRef.current()
    }

    window.speechSynthesis.speak(u)
  }, [docs, loopList, pitch, rate, resolveVoice, stopSpeech, volume])

  speakNextChunkRef.current = speakNextChunk

  const playFromCurrent = useCallback(() => {
    if (!docs.length) return
    window.speechSynthesis.cancel()
    playRef.current.stopped = false
    playRef.current.docIdx = Math.min(currentIndex, docs.length - 1)
    playRef.current.chunks = splitTextForTts(docs[playRef.current.docIdx].text)
    playRef.current.chunkIdx = 0
    setCurrentIndex(playRef.current.docIdx)
    setStatus('playing')
    startTimerIfNeeded()
    if (!playRef.current.chunks.length) {
      stopSpeech()
      return
    }
    speakNextChunk()
  }, [currentIndex, docs, speakNextChunk, startTimerIfNeeded, stopSpeech])

  const pauseSpeech = useCallback(() => {
    window.speechSynthesis.pause()
    setStatus('paused')
    clearTimer()
  }, [clearTimer])

  const resumeSpeech = useCallback(() => {
    window.speechSynthesis.resume()
    setStatus('playing')
    startTimerIfNeeded()
  }, [startTimerIfNeeded])

  const togglePlay = useCallback(() => {
    if (!docs.length) return
    if (status === 'playing') pauseSpeech()
    else if (status === 'paused') resumeSpeech()
    else playFromCurrent()
  }, [docs.length, pauseSpeech, playFromCurrent, resumeSpeech, status])

  const skipToNextDocument = useCallback(() => {
    if (!docs.length) return
    const next = currentIndex < docs.length - 1 ? currentIndex + 1 : loopList ? 0 : currentIndex
    setCurrentIndex(next)
    if (status === 'playing') {
      playRef.current.stopped = false
      playRef.current.docIdx = next
      playRef.current.chunks = splitTextForTts(docs[next].text)
      playRef.current.chunkIdx = 0
      window.speechSynthesis.cancel()
      if (!playRef.current.chunks.length) {
        stopSpeech()
        return
      }
      speakNextChunk()
    }
  }, [currentIndex, docs, loopList, speakNextChunk, status, stopSpeech])

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setError(null)
    setParseBusy(true)
    try {
      let files = Array.from(list)
      const tooLarge = files.filter((f) => f.size > MAX_FILE_BYTES)
      files = files.filter((f) => f.size <= MAX_FILE_BYTES)
      const oversizeMsg =
        tooLarge.length > 0 ? tooLarge.map((f) => `${f.name}：超过单文件上限 1GB`).join('\n') : ''
      if (!files.length) {
        if (oversizeMsg) setError(oversizeMsg)
        return
      }

      const serverItems = await extractOnServer(files)
      if (serverItems) {
        void fetchHealth().then(setApiOnline)
        const next: ReaderDoc[] = []
        const errs: string[] = []
        for (const it of serverItems) {
          if (it.ok) next.push({ id: it.id, name: it.name, text: it.text })
          else errs.push(`${it.name}：${it.error}`)
        }
        const mergedErr = [oversizeMsg, errs.length ? errs.join('\n') : ''].filter(Boolean).join('\n')
        if (mergedErr) setError(mergedErr)
        if (next.length) {
          setDocs((prev) => {
            const merged = [...prev, ...next]
            queueMicrotask(() => setCurrentIndex(merged.length - 1))
            return merged
          })
        }
        return
      }

      const next: ReaderDoc[] = []
      const clientFail: string[] = []
      if (oversizeMsg) clientFail.push(oversizeMsg)
      for (const file of files) {
        try {
          const text = await extractDocumentText(file)
          if (!text) {
            clientFail.push(`${file.name} 未解析到文字（可能是扫描版 PDF）`)
            continue
          }
          next.push({ id: crypto.randomUUID(), name: file.name, text })
        } catch (e) {
          clientFail.push(`${file.name}：${e instanceof Error ? e.message : String(e)}`)
        }
      }
      if (clientFail.length) setError(clientFail.join('\n'))
      if (next.length) {
        setDocs((prev) => {
          const merged = [...prev, ...next]
          queueMicrotask(() => setCurrentIndex(merged.length - 1))
          return merged
        })
      }
    } finally {
      setParseBusy(false)
    }
  }

  const removeDoc = (id: string) => {
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === id)
      const filtered = prev.filter((d) => d.id !== id)
      setCurrentIndex((i) => {
        if (!filtered.length) return 0
        if (idx === -1) return Math.min(i, filtered.length - 1)
        if (i === idx) return Math.min(idx, filtered.length - 1)
        if (i > idx) return i - 1
        return i
      })
      return filtered
    })
    stopSpeech()
  }

  /** 调整顺序后按 id 还原当前选中项与正在播放篇的索引 */
  const reorderDocs = useCallback((from: number, to: number) => {
    if (from === to) return
    setDocs((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const selectedId = prev[currentIndex]?.id
      const playingId = prev[playRef.current.docIdx]?.id
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      queueMicrotask(() => {
        if (selectedId != null) {
          const ni = next.findIndex((x) => x.id === selectedId)
          if (ni >= 0) setCurrentIndex(ni)
        }
        if (playingId != null) {
          const ni = next.findIndex((x) => x.id === playingId)
          if (ni >= 0) playRef.current.docIdx = ni
        }
      })
      return next
    })
  }, [currentIndex])

  const moveDoc = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const to = direction === 'up' ? index - 1 : index + 1
      reorderDocs(index, to)
    },
    [reorderDocs],
  )

  useEffect(() => () => stopSpeech(), [stopSpeech])

  useEffect(() => {
    let alive = true
    void (async () => {
      const ok = await fetchHealth()
      if (alive) setApiOnline(ok)
    })()
    return () => {
      alive = false
    }
  }, [])

  const current = docs[currentIndex]

  return (
    <div className="flex min-h-[100vh] flex-col bg-gradient-to-b from-[#f7f4ff]/90 via-slate-50 to-slate-100 text-slate-900">
      <header className="flex items-center gap-3 border-b border-[#9D7BFF]/20 bg-white/85 px-4 py-3 shadow-sm shadow-[#9D7BFF]/10 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-0.5">
          <img
            src="/logo.png"
            alt="Listen to Me"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-white/90"
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">Listen to Me</h1>
            <p className="truncate text-xs text-slate-500">文档朗读 · PDF / Word（.docx）· 系统语音离线播放</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-400">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  apiOnline === null ? 'animate-pulse bg-slate-300' : apiOnline ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              {apiOnline === null
                ? '检测解析服务…'
                : apiOnline
                  ? '解析服务在线'
                  : '离线解析（浏览器）'}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition ${
              dropHighlight
                ? 'border-[#9D7BFF] bg-[#f5f0ff]'
                : 'border-slate-200 bg-slate-50/50 hover:border-[#9D7BFF]/45 hover:bg-[#f5f0ff]/60'
            }`}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dropDepthRef.current += 1
              setDropHighlight(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dropDepthRef.current -= 1
              if (dropDepthRef.current <= 0) {
                dropDepthRef.current = 0
                setDropHighlight(false)
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dropDepthRef.current = 0
              setDropHighlight(false)
              void onFiles(e.dataTransfer.files)
            }}
          >
            <IconUpload className={`h-10 w-10 shrink-0 ${dropHighlight ? 'text-[#9D7BFF]' : 'text-slate-400'}`} />
            <span className="mt-3 text-sm font-medium text-slate-700">
              {parseBusy ? '正在解析…' : '点击或拖入上传 PDF / .docx'}
            </span>
            <span className="mt-1 text-center text-xs text-slate-500">
              单文件最大 1 GB · 不支持加密或纯扫描件（需可选中复制的文字）
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={parseBusy}
              multiple
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          {error ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconListOrdered className="h-4 w-4 text-[#9D7BFF]" />
            播放列表
          </div>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {docs.length === 0 ? (
              <li className="rounded-lg bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                暂无文档，请先上传
              </li>
            ) : null}
            {docs.map((d, i) => (
              <li
                key={d.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = Number(e.dataTransfer.getData('application/x-doc-reader-index'))
                  setDraggingIndex(null)
                  if (Number.isNaN(from) || from === i) return
                  reorderDocs(from, i)
                }}
                className={draggingIndex === i ? 'opacity-60' : ''}
              >
                <div
                  className={`flex items-center gap-1 rounded-xl border px-2 py-2 text-left text-sm transition sm:gap-2 ${
                    i === currentIndex
                      ? 'border-[#9D7BFF]/35 bg-[#f5f0ff]/90 text-slate-900'
                      : 'border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    draggable
                    role="button"
                    tabIndex={0}
                    title="按住拖拽调整顺序"
                    aria-label={`拖拽排序：${d.name}`}
                    onDragStart={(e) => {
                      setDraggingIndex(i)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('application/x-doc-reader-index', String(i))
                    }}
                    onDragEnd={() => setDraggingIndex(null)}
                    className="cursor-grab touch-none p-1 text-slate-400 active:cursor-grabbing"
                  >
                    <IconGripVertical className="h-4 w-4 shrink-0" />
                  </span>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      aria-label="上移"
                      disabled={i === 0}
                      onClick={() => moveDoc(i, 'up')}
                      className="rounded-md p-0.5 text-slate-500 transition hover:bg-white hover:text-[#8a66f0] disabled:opacity-25"
                    >
                      <IconChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="下移"
                      disabled={i === docs.length - 1}
                      onClick={() => moveDoc(i, 'down')}
                      className="rounded-md p-0.5 text-slate-500 transition hover:bg-white hover:text-[#8a66f0] disabled:opacity-25"
                    >
                      <IconChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => {
                      setCurrentIndex(i)
                      if (status === 'playing') {
                        stopSpeech()
                        setTimeout(() => {
                          setCurrentIndex(i)
                          playRef.current.docIdx = i
                          playFromCurrent()
                        }, 80)
                      }
                    }}
                  >
                    <span className="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200/80 text-[11px] font-semibold tabular-nums text-slate-600">
                      {i + 1}
                    </span>
                    <IconFileText className="mr-1 inline h-3.5 w-3.5 opacity-60" />
                    {d.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    title="从列表中删除"
                  >
                    <IconTrash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!docs.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9D7BFF] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#8a66f0] disabled:opacity-40"
            >
              {status === 'playing' ? (
                <>
                  <IconPause className="h-4 w-4 text-white" />
                  暂停
                </>
              ) : (
                <>
                  <IconPlay className="h-4 w-4 text-white" />
                  {status === 'paused' ? '继续' : '朗读'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={stopSpeech}
              disabled={status === 'idle'}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <IconSquare className="h-3.5 w-3.5 text-slate-700" />
              停止
            </button>
            <button
              type="button"
              onClick={skipToNextDocument}
              disabled={!docs.length || (!loopList && currentIndex >= docs.length - 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <IconSkipForward className="h-4 w-4" />
              下一篇
            </button>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <IconRepeat className={`h-4 w-4 ${loopList ? 'text-[#9D7BFF]' : ''}`} />
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={loopList}
                onChange={(e) => setLoopList(e.target.checked)}
              />
              列表循环
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconVolume2 className="h-4 w-4 text-[#9D7BFF]" />
            声音与速度
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              音色（系统语音包）
              <select
                value={voiceUri}
                onChange={(e) => setVoiceUri(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#9D7BFF]"
              >
                {voices.map((v) => (
                  <option key={`${v.voiceURI}-${v.lang}`} value={`${v.voiceURI}::${v.lang}`}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              语速 {rate.toFixed(1)}x
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-3 w-full accent-[#9D7BFF]"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              音高（微调「音色」听感） {pitch.toFixed(2)}
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="mt-3 w-full accent-[#9D7BFF]"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              音量
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="mt-3 w-full accent-[#9D7BFF]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconClock className="h-4 w-4 text-[#9D7BFF]" />
            定时停止
          </div>
          <p className="mt-1 text-xs text-slate-500">开始朗读后倒计时，时间到自动停止（适合睡前听书）</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#9D7BFF]"
            >
              <option value={0}>关闭</option>
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={45}>45 分钟</option>
              <option value={60}>60 分钟</option>
              <option value={90}>90 分钟</option>
            </select>
            <span className="text-xs text-slate-500">
              {timerMinutes > 0 && status === 'playing' ? '计时运行中…' : ''}
            </span>
          </div>
        </section>

        {current ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">当前文稿预览 · {current.name}</p>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
              {current.text.slice(0, 12000)}
              {current.text.length > 12000 ? '\n…（以下省略，朗读仍为全文）' : ''}
            </pre>
          </section>
        ) : null}
      </div>
    </div>
  )
}
