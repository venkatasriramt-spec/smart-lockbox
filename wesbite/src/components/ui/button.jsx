import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 shadow-md hover:shadow-lg active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-[#059669] text-white hover:bg-[#047857]', // Bright emerald green
        secondary: 'bg-[#0891B2] text-white hover:bg-[#0E7490]', // Teal
        destructive: 'bg-[#EF4444] text-white hover:bg-[#DC2626]', // Coral red
        accent: 'bg-[#EA580C] text-white hover:bg-[#C2410C]', // Orange
        outline: 'border-2 border-input bg-background hover:bg-muted text-foreground',
        ghost: 'hover:bg-muted hover:text-foreground shadow-none hover:shadow-none hover:scale-100',
        link: 'text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none hover:scale-100',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-lg px-4',
        lg: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };