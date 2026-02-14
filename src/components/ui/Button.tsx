import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'secondary-white' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeStyles = {
  sm: 'py-1.5 px-4 text-sm',
  md: 'py-2.5 px-6 text-base',
  lg: 'py-3 px-8 text-lg',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  'secondary-white': 'btn-secondary-white',
  ghost: 'hover:bg-gray-100 text-gray-700 transition-colors',
  outline: 'border-2 border-gray-300 hover:border-mint-500 hover:text-mint-600 text-gray-700 transition-colors',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
