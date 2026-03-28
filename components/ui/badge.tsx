import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-violet-600/20 text-violet-300 ring-1 ring-inset ring-violet-500/30',
        secondary:
          'bg-gray-800 text-gray-300 ring-1 ring-inset ring-gray-700',
        success:
          'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
        warning:
          'bg-yellow-500/20 text-yellow-300 ring-1 ring-inset ring-yellow-500/30',
        destructive:
          'bg-red-500/20 text-red-300 ring-1 ring-inset ring-red-500/30',
        outline:
          'bg-transparent text-gray-300 ring-1 ring-inset ring-gray-600',
        demo:
          'bg-violet-500/20 text-violet-300 ring-1 ring-inset ring-violet-500/40 font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
