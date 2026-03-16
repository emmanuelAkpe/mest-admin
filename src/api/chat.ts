const API_BASE = import.meta.env.VITE_API_URL as string

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
  timestamp?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export type SSEEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_done'; name: string }
  | { type: 'response'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export async function streamChat({
  message,
  sessionId,
  context,
  token,
  onEvent,
}: {
  message: string
  sessionId: string | null
  context: { cohortId?: string; eventId?: string; teamId?: string }
  token: string
  onEvent: (event: SSEEvent) => void
}): Promise<void> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, sessionId, context }),
  })

  if (!response.ok || !response.body) {
    onEvent({ type: 'error', message: 'Failed to connect to Intelligence.' })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as SSEEvent
          onEvent(event)
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

export async function listSessions(token: string): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/chat/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return (json?.data?.sessions ?? []) as ChatSession[]
}

export async function loadSession(id: string, token: string): Promise<ChatSession | null> {
  const res = await fetch(`${API_BASE}/chat/sessions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return (json?.data?.session ?? null) as ChatSession | null
}
