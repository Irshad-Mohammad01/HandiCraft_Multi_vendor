import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title = 'No items found',
  description = 'There is nothing to display here at the moment.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-[#E6D8CC] craft-card-shadow max-w-md mx-auto my-8 ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] mb-4">
          <Icon className="w-8 h-8 stroke-[1.5]" />
        </div>
      )}
      <h3 className="font-serif text-xl font-bold text-[#2B2523] mb-2">{title}</h3>
      <p className="text-sm text-[#6F625D] max-w-xs mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
