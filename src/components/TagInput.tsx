import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
  max?: number
}

export function TagInput({ value, onChange, suggestions, placeholder = 'Type to search…', max }: Props) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = input.trim()
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
      )
    : []

  const add = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed)) return
    if (max && value.length >= max) return
    onChange([...value, trimmed])
    setInput('')
    setOpen(false)
    setHighlighted(0)
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) add(filtered[highlighted])
      else if (input.trim()) add(input.trim())
    } else if (e.key === 'Backspace' && !input && value.length) {
      remove(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const reachedMax = !!max && value.length >= max

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-10 flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 transition-all focus-within:border-[#0d968b] focus-within:ring-1 focus-within:ring-[#0d968b] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#0d968b]/10 px-2.5 py-0.5 text-xs font-medium text-[#0b847a]"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag) }}
              className="rounded-full text-[#0b847a]/60 hover:text-[#0b847a] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!reachedMax && (
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); setHighlighted(0) }}
            onKeyDown={handleKey}
            onFocus={() => input && setOpen(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); add(s) }}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? 'bg-[#0d968b]/10 text-[#0b847a] font-medium' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
