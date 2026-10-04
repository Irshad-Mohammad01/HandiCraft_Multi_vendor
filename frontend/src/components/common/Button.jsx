import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // primary | secondary | outline | ghost | danger
  size = 'md', // sm | md | lg
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  }[size] || 'text-sm px-4 py-2.5 gap-2';

  const variantStyles = {
    primary: 'bg-[#A63D40] text-white hover:bg-[#8F3034] shadow-sm active:scale-[0.99]',
    secondary: 'bg-[#F4E8DC] text-[#2B2523] hover:bg-[#E6D8CC] active:scale-[0.99]',
    outline: 'border border-[#E6D8CC] bg-white text-[#2B2523] hover:bg-[#FFF9F3] hover:border-[#A63D40] hover:text-[#A63D40]',
    ghost: 'text-[#6F625D] hover:text-[#2B2523] hover:bg-[#F4E8DC]/50',
    danger: 'bg-[#B84242] text-white hover:bg-[#9E3636]',
  }[variant] || 'bg-[#A63D40] text-white hover:bg-[#8F3034]';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
