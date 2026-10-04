export const DEFAULT_SUPPORT_LINKS = [
  { id: 'default-phone', title: '+91 98765 43210', url: 'tel:+919876543210', icon: 'Phone', is_active: true },
  { id: 'default-mail', title: 'support@SSJewellery.com', url: 'mailto:support@SSJewellery.com', icon: 'Mail', is_active: true },
  { id: 'default-map', title: 'Connaught Place, New Delhi, India', url: 'https://maps.google.com/?q=Connaught+Place,+New+Delhi,+India', icon: 'MapPin', is_active: true },
];

const extractEmail = (link) => {
  const raw = String(link?.url || '').trim();
  if (raw.toLowerCase().startsWith('mailto:')) return raw.slice(7).split('?')[0];
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw;
  const title = String(link?.title || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(title) ? title : '';
};

export const getSupportLinkProps = (link) => {
  const icon = String(link?.icon || '').toLowerCase();
  const rawUrl = String(link?.url || '').trim();

  if (icon === 'mail' || rawUrl.toLowerCase().startsWith('mailto:')) {
    const email = extractEmail(link);
    return {
      href: email
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
        : 'https://mail.google.com/mail/?view=cm&fs=1',
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  }

  if (icon === 'phone' || rawUrl.toLowerCase().startsWith('tel:')) {
    const phone = (rawUrl.replace(/^tel:/i, '') || String(link?.title || '')).replace(/[^+\d]/g, '');
    return { href: `tel:${phone}` };
  }

  if (rawUrl.startsWith('/')) return { href: rawUrl };
  return { href: rawUrl || '#', target: '_blank', rel: 'noopener noreferrer' };
};
