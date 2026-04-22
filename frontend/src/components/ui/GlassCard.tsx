import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glowColor?: 'blue' | 'purple' | 'red' | 'green' | 'yellow';
}

export const GlassCard = ({ 
  children, 
  className, 
  hover = false,
  glow = false,
  glowColor = 'blue',
  ...props 
}: GlassCardProps) => {
  return (
    <div 
      className={cn(
        "bg-[#0a0a0a] border border-[#1a1a1a] transition-all duration-300",
        hover && "hover:border-white hover:bg-[#111111]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
