import { cn } from "@/lib/utils"
import { JSX, ReactNode } from "react"

type TitleProps = {
  level?: 1 | 2 | 3 | 4
  children: ReactNode
  className?: string
  id?: string
}

const baseStyles = {
  1: "text-3xl sm:text-4xl md:text-5xl font-bold",
  2: "text-2xl sm:text-3xl md:text-4xl font-bold",
  3: "text-xl sm:text-2xl md:text-3xl font-semibold",
  4: "text-lg sm:text-xl font-medium"
}

export default function Title({ level = 2, children, className = "", id }: TitleProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <Tag id={id} className={cn(baseStyles[level], "text-gray-900 dark:text-white", className)}>
      {children}
    </Tag>
  )
}
