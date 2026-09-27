"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

type PopoverDismissContextValue = {
  dismiss: () => void
  ownerId: string
}

const PopoverDismissContext =
  React.createContext<PopoverDismissContextValue | null>(
    null,
  )

function Popover({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const [internalOpen, setInternalOpen] =
    React.useState(defaultOpen ?? false)
  const open =
    controlledOpen ?? internalOpen
  const ownerId = React.useId()

  const handleOpenChange =
    React.useCallback(
      (nextOpen: boolean) => {
        if (
          controlledOpen === undefined
        ) {
          setInternalOpen(nextOpen)
        }

        onOpenChange?.(nextOpen)
      },
      [
        controlledOpen,
        onOpenChange,
      ],
    )

  const dismiss = React.useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  )

  React.useEffect(() => {
    if (
      !open ||
      typeof document === 'undefined'
    ) {
      return
    }

    const onDocumentPointerDown = (
      event: PointerEvent,
    ) => {
      const target = event.target

      if (!(target instanceof Element)) {
        dismiss()
        return
      }

      if (
        target.closest(
          `[data-crms-popover-owner="${ownerId}"]`,
        )
      ) {
        return
      }

      dismiss()
    }

    document.addEventListener(
      'pointerdown',
      onDocumentPointerDown,
      true,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        onDocumentPointerDown,
        true,
      )
    }
  }, [dismiss, open, ownerId])

  const contextValue =
    React.useMemo(
      () => ({
        dismiss,
        ownerId,
      }),
      [dismiss, ownerId],
    )

  return (
    <PopoverDismissContext.Provider
      value={contextValue}
    >
      <PopoverPrimitive.Root
        data-slot="popover"
        open={open}
        onOpenChange={
          handleOpenChange
        }
        {...props}
      />
    </PopoverDismissContext.Provider>
  )
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const context =
    React.useContext(
      PopoverDismissContext,
    )

  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      data-crms-popover-owner={
        context?.ownerId
      }
      {...props}
    />
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const context =
    React.useContext(
      PopoverDismissContext,
    )
  const dismiss =
    context?.dismiss

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-crms-popover-owner={
          context?.ownerId
        }
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        onPointerDownOutside={(
          event,
        ) => {
          onPointerDownOutside?.(
            event,
          )

          if (
            !event.defaultPrevented
          ) {
            dismiss?.()
          }
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
