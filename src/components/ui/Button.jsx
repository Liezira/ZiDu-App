import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility cn — diexport agar bisa dipakai komponen lain
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const variants = {
  primary:
    'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm',
  secondary:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 shadow-sm',
  danger:
    'bg-error-600 hover:bg-error-700 active:bg-error-800 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
};

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      isLoading = false,
      icon: Icon,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-lg',
          'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          Icon && <Icon size={18} />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
