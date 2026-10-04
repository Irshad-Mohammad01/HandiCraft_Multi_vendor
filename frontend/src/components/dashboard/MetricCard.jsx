import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-[#E6D8CC] p-5 craft-card-shadow flex items-start justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#6F625D] uppercase tracking-wider">{title}</p>
        <p className="font-serif text-2xl font-bold text-[#2B2523]">{value}</p>
        {subtitle && <p className="text-[11px] text-[#6F625D]">{subtitle}</p>}
        {trend && (
          <p className="text-[11px] font-semibold text-[#3F7D5A] flex items-center gap-1 mt-1">
            <span>↑</span> {trend}
          </p>
        )}
      </div>

      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
          <Icon className="w-5 h-5 stroke-[1.75]" />
        </div>
      )}
    </div>
  );
};

export default MetricCard;
