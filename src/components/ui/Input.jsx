import React from 'react';
import { cn } from './Button';

export const Input = React.forwardRef(
  ({ className, label, error, icon: Icon, required, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-error-500">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-3 py-2 bg-white border rounded-lg text-sm transition-shadow',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
              'placeholder:text-gray-400',
              Icon && 'pl-10',
              error
                ? 'border-error-500 focus:ring-error-500'
                : 'border-gray-300',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-error-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
