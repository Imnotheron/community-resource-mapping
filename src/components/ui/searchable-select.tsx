'use client'

import * as React from 'react'
import {
  Check,
  ChevronsUpDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type SearchableSelectOption = {
  value: string
  label: string
  keywords?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No matching option.',
  disabled = false,
  className,
  contentClassName,
}: {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  contentClassName?: string
}) {
  const [open, setOpen] =
    React.useState(false)

  const selected =
    options.find(
      (option) =>
        option.value === value,
    )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected &&
              !value &&
              'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selected?.label ||
              value ||
              placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'w-[var(--radix-popover-trigger-width)] p-0',
          contentClassName,
        )}
      >
        <Command>
          <CommandInput
            placeholder={
              searchPlaceholder
            }
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {options.map(
                (option) => (
                  <CommandItem
                    key={option.value}
                    value={[
                      option.label,
                      option.value,
                      option.keywords ||
                        '',
                    ].join(' ')}
                    onSelect={() => {
                      onValueChange(
                        option.value,
                      )
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value ===
                          option.value
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    <span className="truncate">
                      {option.label}
                    </span>
                  </CommandItem>
                ),
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
