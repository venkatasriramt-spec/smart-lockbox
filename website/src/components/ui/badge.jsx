import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, Lock, Unlock, Activity } from 'lucide-react';

const Badge = ({ className, variant = 'default', children, icon, ...props }) => {
  const variants = {
    default: 'bg-gray-200 text-gray-800',
    COMPLETED: 'bg-[#10B981] text-white shadow-sm', // Green
    KEY_NOT_RETURNED: 'bg-[#EF4444] text-white shadow-md animate-pulse', // Red
    PENDING: 'bg-[#EA580C] text-white shadow-sm', // Orange
    ACTIVE: 'bg-[#0891B2] text-white shadow-sm', // Teal
    UNLOCKED: 'bg-[#059669] text-white shadow-sm', // Emerald
    LOCKED: 'bg-slate-200 text-slate-800', // Gray
    outline: 'bg-transparent border-2 border-gray-200 text-gray-700',
    danger: 'bg-[#EF4444] text-white',
    success: 'bg-[#10B981] text-white'
  };

  const getIcon = () => {
    switch (variant) {
      case 'KEY_NOT_RETURNED': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'COMPLETED': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'PENDING': return <Clock className="w-3.5 h-3.5" />;
      case 'UNLOCKED': return <Unlock className="w-3.5 h-3.5" />;
      case 'LOCKED': return <Lock className="w-3.5 h-3.5" />;
      case 'ACTIVE': return <Activity className="w-3.5 h-3.5" />;
      default: return icon;
    }
  };

  // Convert raw status string if needed (e.g. from history logs)
  let appliedVariant = variant;
  if (['COMPLETED', 'KEY_NOT_RETURNED', 'PENDING', 'ACTIVE', 'UNLOCKED', 'LOCKED'].includes(variant?.toUpperCase())) {
     appliedVariant = variant.toUpperCase();
  } else if (variant === 'approved') {
     appliedVariant = 'ACTIVE';
  } else if (variant === 'rejected' || variant === 'expired') {
     appliedVariant = 'LOCKED';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 tracking-wide gap-1.5 border border-transparent',
        variants[appliedVariant] || variants.default,
        className
      )}
      {...props}
    >
      {getIcon()}
      {children}
    </span>
  );
};

export default Badge;
export { Badge };