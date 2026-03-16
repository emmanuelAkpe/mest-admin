import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-semibold text-slate-900',
        nav: 'space-x-1 flex items-center',
        nav_button:
          'h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-transparent text-slate-600 opacity-50 hover:opacity-100 transition-opacity',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center',
        row: 'flex w-full mt-2',
        cell: cn(
          'h-9 w-9 text-center text-sm p-0 relative',
          '[&:has([aria-selected])]:bg-[#0d968b]/10 [&:has([aria-selected])]:rounded-md',
          'first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
          'focus-within:relative focus-within:z-20'
        ),
        day: cn(
          'h-9 w-9 p-0 font-normal rounded-md inline-flex items-center justify-center',
          'text-slate-900 hover:bg-slate-100 transition-colors',
          'aria-selected:opacity-100'
        ),
        day_selected:
          'bg-[#0d968b] text-white hover:bg-[#0b847a] hover:text-white focus:bg-[#0d968b] focus:text-white rounded-md',
        day_today: 'font-bold text-[#0d968b]',
        day_outside: 'text-slate-300 opacity-50',
        day_disabled: 'text-slate-300 opacity-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
