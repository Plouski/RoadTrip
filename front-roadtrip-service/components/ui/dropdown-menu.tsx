"use client"

import * as React from "react"
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownPrimitive.Root
const DropdownMenuTrigger = DropdownPrimitive.Trigger
const DropdownMenuPortal = DropdownPrimitive.Portal

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPortal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] rounded-md border bg-white p-1 text-sm shadow-md",
        className
      )}
      {...props}
    />
  </DropdownMenuPortal>
))
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      "cursor-pointer select-none rounded-sm px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none",
      "flex items-center gap-2 transition-colors",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-gray-100", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
