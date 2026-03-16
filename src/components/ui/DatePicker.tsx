import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Calendar } from './Calendar'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = value ? parseISO(value) : undefined

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm outline-none transition-all',
            'hover:border-slate-300',
            open && 'border-[#0d968b] ring-1 ring-[#0d968b]',
            !value && 'text-slate-400'
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={value ? 'text-slate-900' : 'text-slate-400'}>
            {selected ? format(selected, 'MMM d, yyyy') : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
