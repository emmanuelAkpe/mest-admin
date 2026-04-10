import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, Inbox, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/api/notifications'
import { formatDistanceToNow } from 'date-fns'

const TYPE_LABELS: Record<Notification['type'], string> = {
  submission_received: 'Submission',
  evaluation_submitted: 'Evaluation',
  mentor_review_added: 'Mentor Review',
  ai_review_ready: 'AI Review',
  deadline_approaching: 'Deadline',
  ai_programme_briefing: 'Briefing',
}

const TYPE_COLORS: Record<Notification['type'], string> = {
  submission_received: 'bg-blue-100 text-blue-700',
  evaluation_submitted: 'bg-violet-100 text-violet-700',
  mentor_review_added: 'bg-amber-100 text-amber-700',
  ai_review_ready: 'bg-teal-100 text-teal-700',
  deadline_approaching: 'bg-red-100 text-red-700',
  ai_programme_briefing: 'bg-slate-100 text-slate-700',
}

interface Props {
  cohortId?: string
}

export function NotificationBell({ cohortId }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', cohortId],
    queryFn: () => notificationsApi.list(cohortId ? { cohort: cohortId } : undefined),
    refetchInterval: 30_000,
  })

  const notifications: Notification[] = (data?.data as any)?.data?.notifications ?? []
  const unreadCount: number = (data?.data as any)?.data?.unreadCount ?? 0

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(cohortId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) {
      navigate(n.link)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
              >
                {markAll.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    !n.isRead ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {!n.isRead && (
                        <span className="mt-1.5 block h-2 w-2 rounded-full bg-teal-500" />
                      )}
                      {n.isRead && <span className="mt-1.5 block h-2 w-2" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[n.type]}`}>
                          {TYPE_LABELS[n.type]}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }}
                        className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
