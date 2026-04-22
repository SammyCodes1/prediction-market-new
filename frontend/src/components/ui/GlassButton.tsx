import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const GlassButton = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled,
  ...props 
}: GlassButtonProps) => {
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200",
    secondary: "bg-[#1a1a1a] text-white border border-[#2a2a2a] hover:bg-[#222222] hover:border-white",
    outline: "bg-transparent text-white border border-white hover:bg-white hover:text-black",
    success: "bg-white text-black border border-white hover:bg-gray-200",
    danger: "bg-transparent text-white border border-white hover:bg-white hover:text-black",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs font-bold uppercase tracking-wider",
    md: "px-6 py-3 text-sm font-bold uppercase tracking-wider",
    lg: "px-8 py-4 text-base font-bold uppercase tracking-wider",
  };

  return (
    <button 
      className={cn(
        "relative inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 font-mono",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
