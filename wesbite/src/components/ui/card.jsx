import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3 className={cn('text-2xl font-bold tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
};

export const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};