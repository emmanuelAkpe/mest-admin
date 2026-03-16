import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { MessageCircle, Sparkles, X, Plus, Send, Loader2, Clock, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { streamChat, listSessions, loadSession, type SSEEvent, type ChatSession } from '@/api/chat'

const TEAL = '#0d968b'

const SUGGESTED_PROMPTS = [
  'Which teams are at risk this cohort?',
  'What are the top performing teams from the last evaluation?',
  'Give me a deep analysis of team dynamics',
  'How does this cohort compare to previous ones?',
]

// Tool name → human-readable label
function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    listCohorts: 'Fetching cohorts',
    getCohortStats: 'Querying cohort stats',
    searchTeams: 'Searching teams',
    getTeamDeepProfile: 'Loading team profile',
    listTrainees: 'Fetching trainees',
    getTraineeProfile: 'Loading trainee profile',
    listEvents: 'Fetching events',
    getEventEvaluationResults: 'Fetching evaluations',
    getTeamRankings: 'Computing rankings',
    identifyAtRiskSignals: 'Identifying at-risk signals',
    getTeamProgressOverTime: 'Tracking team trajectory',
    getCohortBenchmarks: 'Benchmarking cohorts',
    getJudgeCalibration: 'Analysing judge calibration',
    getMemberCrossTeamHistory: 'Mapping member network',
  }
  return labels[name] ?? `Querying ${name}`
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderMarkdown(
  text: string,
  onFollowUp?: (prompt: string) => void
): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let ulBuffer: React.ReactNode[] = []
  let key = 0
  let inExploreSection = false

  function flushList() {
    if (ulBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="my-2 list-none space-y-1 pl-0">
          {ulBuffer}
        </ul>
      )
      ulBuffer = []
    }
  }

  function parseInline(raw: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let last = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(raw)) !== null) {
      if (match.index > last) parts.push(raw.slice(last, match.index))
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`b-${key++}`} className="font-semibold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        )
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={`c-${key++}`} className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">
            {token.slice(1, -1)}
          </code>
        )
      }
      last = match.index + token.length
    }
    if (last < raw.length) parts.push(raw.slice(last))
    return parts
  }

  let inRiskSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Horizontal rule ---
    if (line.trim() === '---') {
      flushList()
      inExploreSection = false
      inRiskSection = false
      elements.push(
        <hr key={`hr-${key++}`} className="my-3 border-slate-100" />
      )
      continue
    }

    // Heading ##
    if (line.startsWith('## ')) {
      flushList()
      const heading = line.slice(3).trim()
      inExploreSection = heading.includes('Explore Further')
      inRiskSection = heading.includes('Risk')

      if (inExploreSection) {
        elements.push(
          <p key={`h-${key++}`} className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-teal-600">
            {heading.replace('💬', '').trim()}
          </p>
        )
      } else if (heading.includes('💡 Recommendation') || heading.includes('Recommendation')) {
        elements.push(
          <div key={`rechdr-${key++}`} className="mt-4 flex items-center gap-1.5">
            <span className="text-sm">💡</span>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Recommendations</p>
          </div>
        )
      } else if (inRiskSection) {
        elements.push(
          <div key={`riskhdr-${key++}`} className="mt-4 flex items-center gap-1.5">
            <span className="text-sm">⚠️</span>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Risk Flags</p>
          </div>
        )
      } else {
        elements.push(
          <h3 key={`h-${key++}`} className="mb-1 mt-4 text-sm font-bold text-slate-900 first:mt-0">
            {parseInline(heading)}
          </h3>
        )
      }
      continue
    }

    // Heading ###
    if (line.startsWith('### ')) {
      flushList()
      inExploreSection = false
      inRiskSection = false
      const heading = line.slice(4).trim()
      elements.push(
        <p key={`h3-${key++}`} className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {heading}
        </p>
      )
      continue
    }

    // Heading #
    if (line.startsWith('# ')) {
      flushList()
      inExploreSection = false
      inRiskSection = false
      elements.push(
        <h2 key={`h1-${key++}`} className="mb-1 mt-3 text-base font-bold text-slate-900 first:mt-0">
          {parseInline(line.slice(2).trim())}
        </h2>
      )
      continue
    }

    // 💡 Recommendation block (inline, not heading)
    if ((line.includes('💡 Recommendation') || line.startsWith('💡')) && !line.startsWith('##')) {
      flushList()
      inExploreSection = false
      inRiskSection = false
      const content = line.replace('💡 Recommendation', '').replace('💡', '').trim()
      if (content) {
        elements.push(
          <p key={`rec-inline-${key++}`} className="text-sm text-slate-700 leading-relaxed">
            {parseInline(content)}
          </p>
        )
      } else {
        elements.push(
          <div key={`rechdr-${key++}`} className="mt-4 flex items-center gap-1.5">
            <span className="text-sm">💡</span>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Recommendations</p>
          </div>
        )
      }
      continue
    }

    // ⚠️ Risk block (inline, not heading)
    if (line.startsWith('⚠️') && !line.startsWith('##')) {
      flushList()
      const content = line.replace('⚠️', '').trim()
      elements.push(
        <div key={`risk-inline-${key++}`} className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700">⚠️ {content}</p>
        </div>
      )
      continue
    }

    // Bullet list item
    if (line.match(/^[-•*]\s/)) {
      const content = line.slice(2).trim()

      if (inExploreSection && onFollowUp) {
        flushList()
        // Strip surrounding brackets if model added them
        const clean = content.replace(/^\[/, '').replace(/\]$/, '')
        elements.push(
          <button
            key={`fp-${key++}`}
            onClick={() => onFollowUp(clean)}
            className="mb-1.5 block w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-left text-xs text-teal-800 transition-colors hover:bg-teal-100 hover:border-teal-300"
          >
            → {clean}
          </button>
        )
        continue
      }

      if (inRiskSection) {
        flushList()
        elements.push(
          <div key={`riskitem-${key++}`} className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-800">{parseInline(content)}</p>
          </div>
        )
        continue
      }

      ulBuffer.push(
        <li key={`li-${key++}`} className="flex items-start gap-2 text-sm text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          <span className="leading-relaxed">{parseInline(content)}</span>
        </li>
      )
      continue
    }

    // Numbered list item
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      flushList()
      elements.push(
        <div key={`num-${key++}`} className="flex items-start gap-2 text-sm text-slate-700">
          <span
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {numberedMatch[1]}
          </span>
          <span className="leading-relaxed">{parseInline(numberedMatch[2])}</span>
        </div>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      flushList()
      elements.push(<div key={`gap-${key++}`} className="h-1.5" />)
      continue
    }

    // Plain text
    flushList()
    elements.push(
      <p key={`p-${key++}`} className="text-sm text-slate-700 leading-relaxed">
        {parseInline(line)}
      </p>
    )
  }

  flushList()
  return elements
}

// ─── Message Types ────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'model'
  content: string
  displayContent: string
  isTyping?: boolean
}

type PanelView = 'chat' | 'history'

// ─── Component ────────────────────────────────────────────────────────────────

export function MestChat({
  context,
}: {
  context?: { cohortId?: string; eventId?: string; teamId?: string }
}) {
  const token = useAuthStore((s) => s.accessToken)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PanelView>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())
  const [showTypingDots, setShowTypingDots] = useState(false)

  // Sessions history state
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTools, showTypingDots])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [input])

  // Load sessions when history view opens
  useEffect(() => {
    if (view === 'history' && token) {
      setSessionsLoading(true)
      listSessions(token)
        .then(setSessions)
        .finally(() => setSessionsLoading(false))
    }
  }, [view, token])

  const startTypewriter = useCallback((msgId: string, fullText: string) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    typewriterRef.current = setInterval(() => {
      i += 1
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, displayContent: fullText.slice(0, i), isTyping: i < fullText.length }
            : m
        )
      )
      if (i >= fullText.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }, 8)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || !token) return

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        displayContent: text.trim(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setStreaming(true)
      setShowTypingDots(true)
      setActiveTools(new Set())
      setView('chat')

      let currentSessionId = sessionId
      const modelMsgId = `model-${Date.now()}`

      try {
        await streamChat({
          message: text.trim(),
          sessionId: currentSessionId,
          context: context ?? {},
          token,
          onEvent: (event: SSEEvent) => {
            switch (event.type) {
              case 'session':
                currentSessionId = event.sessionId
                setSessionId(event.sessionId)
                break
              case 'tool_start':
                setActiveTools((prev) => new Set([...prev, event.name]))
                break
              case 'tool_done':
                setActiveTools((prev) => {
                  const next = new Set(prev)
                  next.delete(event.name)
                  return next
                })
                break
              case 'response':
                setShowTypingDots(false)
                setActiveTools(new Set())
                setMessages((prev) => [
                  ...prev,
                  { id: modelMsgId, role: 'model', content: event.text, displayContent: '', isTyping: true },
                ])
                startTypewriter(modelMsgId, event.text)
                break
              case 'error':
                setShowTypingDots(false)
                setActiveTools(new Set())
                setMessages((prev) => [
                  ...prev,
                  { id: `err-${Date.now()}`, role: 'model', content: event.message, displayContent: event.message },
                ])
                break
              case 'done':
                setStreaming(false)
                setShowTypingDots(false)
                break
            }
          },
        })
      } catch {
        setShowTypingDots(false)
        setActiveTools(new Set())
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'model', content: 'Something went wrong. Please try again.', displayContent: 'Something went wrong. Please try again.' },
        ])
      } finally {
        setStreaming(false)
        setShowTypingDots(false)
      }
    },
    [streaming, token, sessionId, context, startTypewriter]
  )

  const loadHistorySession = useCallback(async (id: string) => {
    if (!token) return
    const session = await loadSession(id, token)
    if (!session) return
    const msgs: Message[] = session.messages.map((m, i) => ({
      id: `loaded-${i}`,
      role: m.role,
      content: m.content,
      displayContent: m.content,
    }))
    setMessages(msgs)
    setSessionId(session.id)
    setView('chat')
  }, [token])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const startNewChat = () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    setMessages([])
    setSessionId(null)
    setInput('')
    setStreaming(false)
    setShowTypingDots(false)
    setActiveTools(new Set())
    setView('chat')
  }

  const isEmpty = messages.length === 0 && !showTypingDots

  const formatSessionDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ── Render ──

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle MEST Intelligence"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: TEAL }}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : streaming ? (
          <Sparkles className="h-6 w-6 text-white" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white" />
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-20"
              style={{ backgroundColor: TEAL }}
            />
          </>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          style={{
            width: 'min(500px, calc(100vw - 24px))',
            height: 'min(680px, calc(100vh - 110px))',
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 flex-col border-b border-slate-100 px-4 py-3"
            style={{ backgroundColor: '#f8ffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view === 'history' && (
                  <button
                    onClick={() => setView('chat')}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <Sparkles className="h-4 w-4" style={{ color: TEAL }} />
                <span className="text-sm font-semibold text-slate-900">
                  {view === 'history' ? 'Chat History' : 'MEST Intelligence'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {view === 'chat' && (
                  <>
                    <button
                      onClick={() => setView('history')}
                      title="Chat history"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={startNewChat}
                      title="New chat"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  title="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-0.5 text-[10px] italic text-slate-400">Powered by GPT-4o</p>
          </div>

          {/* History View */}
          {view === 'history' && (
            <div className="flex flex-1 flex-col overflow-y-auto">
              {sessionsLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <Clock className="h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium text-slate-400">No conversations yet</p>
                  <p className="text-xs text-slate-300">Your chat history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadHistorySession(session.id)}
                      className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {session.title || 'Untitled conversation'}
                      </p>
                      <p className="text-xs text-slate-400">{formatSessionDate(session.updatedAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat View */}
          {view === 'chat' && (
            <>
              {/* Messages Area */}
              <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3 gap-3">
                {/* Suggested Prompts */}
                {isEmpty && (
                  <div className="flex flex-col gap-2">
                    <p className="text-center text-xs font-medium text-slate-400">
                      Ask me anything about your cohort
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div
                        className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white"
                        style={{ backgroundColor: TEAL }}
                      >
                        {msg.displayContent}
                      </div>
                    ) : (
                      <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                        <div className="min-h-[1em]">
                          {renderMarkdown(msg.displayContent, (prompt) => sendMessage(prompt))}
                        </div>
                        {msg.isTyping && (
                          <span
                            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-sm align-middle"
                            style={{ backgroundColor: TEAL }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Dots — show while waiting and between tool calls */}
                {showTypingDots && activeTools.size === 0 && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full animate-bounce"
                          style={{ backgroundColor: TEAL, animationDelay: `${i * 150}ms`, animationDuration: '800ms' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Tool Chips */}
                {activeTools.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[...activeTools].map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" style={{ color: TEAL }} />
                        {toolLabel(name)}…
                      </div>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3">
                <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask MEST Intelligence…"
                    rows={1}
                    disabled={streaming}
                    className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50"
                    style={{ maxHeight: '96px', overflowY: 'auto' }}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || streaming}
                    className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: TEAL }}
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-300">
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
