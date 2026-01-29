"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../utils"

const selectableCardVariants = cva(
  "flex cursor-pointer items-center rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      size: {
        default: "gap-3 p-3",
        sm: "gap-2 p-2 sm:gap-3 sm:p-3",
      },
      selected: {
        true: "border-primary bg-primary/5",
        false: "hover:border-muted-foreground/50",
      },
    },
    defaultVariants: {
      size: "default",
      selected: false,
    },
  }
)

const indicatorVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
  {
    variants: {
      size: {
        default: "h-5 w-5",
        sm: "h-4 w-4 sm:h-5 sm:w-5",
      },
      selected: {
        true: "border-primary bg-primary text-primary-foreground",
        false: "border-muted-foreground/30",
      },
    },
    defaultVariants: {
      size: "default",
      selected: false,
    },
  }
)

const checkVariants = cva("", {
  variants: {
    size: {
      default: "h-3 w-3",
      sm: "h-2.5 w-2.5 sm:h-3 sm:w-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface SelectableCardProps
  extends Omit<React.ComponentProps<"div">, "onSelect">,
    VariantProps<typeof selectableCardVariants> {
  selected?: boolean
  onSelect: () => void
  action?: React.ReactNode
}

function SelectableCard({
  className,
  size = "default",
  selected = false,
  onSelect,
  action,
  children,
  ...props
}: SelectableCardProps) {
  return (
    <div
      className={cn(selectableCardVariants({ size, selected, className }))}
      onClick={onSelect}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      {...props}
    >
      {/* Selection indicator */}
      <div className={cn(indicatorVariants({ size, selected }))}>
        {selected && <Check className={cn(checkVariants({ size }))} />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>

      {/* Action slot */}
      {action && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  )
}

function SelectableCardTitle({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("truncate text-sm font-medium sm:text-base", className)}
      {...props}
    />
  )
}

function SelectableCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs sm:gap-1.5",
        className
      )}
      {...props}
    />
  )
}

export { SelectableCard, SelectableCardTitle, SelectableCardDescription }
