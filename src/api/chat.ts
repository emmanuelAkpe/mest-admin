import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { mest_server } from './server'

const API_BASE = mest_server

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

export type AgentEvent =
  | { type: 'tool_start'; name: string }
  | { type: 'tool_done'; name: string }
  | { type: 'response'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }
  | { type: 'ping' }

async function refreshToken(): Promise<string> {
  const { data } = await axios.post(`${mest_server}/auth/refresh`, {}, { withCredentials: true })
  const newToken: string = data.data.accessToken
  useAuthStore.getState().setAccessToken(newToken)
  return newToken
}

async function authedFetch(url: string, options: RequestInit, token: string): Promise<Response> {
  let res = await fetch(url, {
    ...options,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    try {
      const newToken = await refreshToken()
      res = await fetch(url, {
        ...options,
        headers: { ...(options.headers ?? {}), Authorization: `Bearer ${newToken}` },
      })
    } catch {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      throw new Error('Session expired.')
    }
  }
  return res
}

export async function startChat({
  message,
  sessionId,
  context,
  token,
}: {
  message: string
  sessionId: string | null
  context: { cohortId?: string; eventId?: string; teamId?: string }
  token: string
}): Promise<{ jobId: string; sessionId: string }> {
  const res = await authedFetch(
    `${API_BASE}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, context }),
    },
    token
  )
  if (!res.ok) throw new Error('Failed to start chat.')
  const json = await res.json()
  return json.data
}

export async function pollChat(
  jobId: string,
  cursor: number,
  token: string
): Promise<{ events: AgentEvent[]; cursor: number; done: boolean }> {
  const res = await authedFetch(
    `${API_BASE}/chat/poll/${jobId}?cursor=${cursor}`,
    {},
    token
  )
  if (!res.ok) throw new Error('Poll failed.')
  const json = await res.json()
  return json.data
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
