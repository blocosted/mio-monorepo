/**
 * Button component with variants
 *
 * A flexible button component using class-variance-authority for variant management.
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white shadow hover:bg-blue-700',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline: 'border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50',
        secondary: 'bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300',
        ghost: 'hover:bg-gray-100 text-gray-900',
        link: 'text-blue-600 underline-offset-4 hover:underline',
        accent: 'bg-pink-600 text-white shadow hover:bg-pink-700'
      },
      size: {
        default: 'h-11 px-6 py-3',
        sm: 'h-9 rounded-md px-4 text-xs',
        lg: 'h-12 rounded-md px-8 py-4',
        icon: 'h-11 w-11'
      },
      shape: {
        default: '',
        pill: 'rounded-full'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, shape, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
