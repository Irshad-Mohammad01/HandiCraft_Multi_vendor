import React from 'react';

export const Badge = ({ status = '', variant = 'default', children, className = '' }) => {
  const norm = (status || children || '').toString().toLowerCase().trim();

  let styles = 'bg-[#F4E8DC] text-[#6F625D] border-[#E6D8CC]';

  if (['delivered', 'active', 'success', 'paid', 'completed'].includes(norm)) {
    styles = 'bg-emerald-50 text-[#3F7D5A] border-emerald-200';
  } else if (['shipped', 'out for delivery', 'in transit'].includes(norm)) {
    styles = 'bg-amber-50 text-[#B77935] border-amber-200';
  } else if (['pending', 'processing', 'confirmed', 'packed'].includes(norm)) {
    styles = 'bg-orange-50 text-[#A63D40] border-[#E6D8CC]';
  } else if (['cancelled', 'failed', 'blocked', 'rejected', 'error'].includes(norm)) {
    styles = 'bg-rose-50 text-[#B84242] border-rose-200';
  } else if (['seller'].includes(norm)) {
    styles = 'bg-[#FFF9F3] text-[#A63D40] border-[#C69A5B]';
  } else if (['owner', 'admin'].includes(norm)) {
    styles = 'bg-[#8F3034] text-white border-[#8F3034]';
  } else if (['sub_owner'].includes(norm)) {
    styles = 'bg-[#A63D40] text-white border-[#A63D40]';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      {children || status}
    </span>
  );
};

export default Badge;
