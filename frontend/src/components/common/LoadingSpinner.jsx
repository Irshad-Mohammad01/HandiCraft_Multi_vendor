import React from 'react';

export const LoadingSpinner = ({ label = 'Loading...', size = 'md', className = '' }) => {
  const spinnerSize = size === 'sm' ? 'w-6 h-6 border-2' : size === 'lg' ? 'w-12 h-12 border-4' : 'w-8 h-8 border-3';

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div
        className={`${spinnerSize} rounded-full border-[#E6D8CC] border-t-[#A63D40] animate-spin mb-3`}
      />
      {label && <p className="text-sm font-medium text-[#6F625D] animate-pulse">{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
