import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import Button from '../components/common/Button';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { supportApi } from '../api/support';

export default function Contact() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Inquiry',
    order_id: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || user.full_name || user.username || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        category: formData.category,
        order_id: formData.order_id.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim()
      };
      const res = await supportApi.submitTicket(payload);
      const ticket = res.ticket || res.support_message || {};
      setSubmittedTicket(ticket);
      setSubmitted(true);
      setFormData({
        name: user?.name || user?.full_name || '',
        email: user?.email || '',
        category: 'General Inquiry',
        order_id: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      console.error('Failed to submit support ticket:', err);
      const msg = err.response?.data?.message || 'Failed to submit your message. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '100vh', padding: '48px 0 80px' }}>
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '0 auto 48px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.25rem', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            We’d Love to Hear From You
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            {settings?.contact_page_info ||
              'Whether you have questions about custom handicraft orders, artisan guild partnerships, or delivery status, our craft care team is here to assist.'}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              backgroundColor: 'var(--color-white)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--color-soft-beige)', color: 'var(--color-primary-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>Email Support</h4>
                <p style={{ margin: '0 0 4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>General & Order Inquiries:</p>
                <a href={`mailto:${settings?.support_email || 'care@craftnest.in'}`} style={{ color: 'var(--color-primary-terracotta)', fontWeight: 600, textDecoration: 'none' }}>
                  {settings?.support_email || 'care@craftnest.in'}
                </a>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-white)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--color-soft-beige)', color: 'var(--color-primary-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>Artisan Hotline</h4>
                <p style={{ margin: '0 0 4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {settings?.working_hours || 'Mon - Sat, 10:00 AM - 7:00 PM IST'}:
                </p>
                <span style={{ color: 'var(--color-primary-terracotta)', fontWeight: 600 }}>
                  {settings?.support_phone || '+91 141 256 7890'}
                </span>
                {settings?.whatsapp_number && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#1B4D3E', fontWeight: 500 }}>
                    WhatsApp: {settings.whatsapp_number}
                  </p>
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-white)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--color-soft-beige)', color: 'var(--color-primary-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>Heritage Hub</h4>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {settings?.business_address || 'CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '36px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircle2 size={56} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: '8px' }}>Message Received</h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                  Dhanyavaad for reaching out. A craft specialist from our team will respond to your inquiry within 24 hours.
                  {submittedTicket?.ticket_id && (
                    <span style={{ display: 'block', marginTop: '10px', fontSize: '0.95rem', color: 'var(--color-primary-terracotta)', fontWeight: 600 }}>
                      Ticket Reference: {submittedTicket.ticket_id}
                    </span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {user && (
                    <Link
                      to={submittedTicket?.id ? `/account/support/${submittedTicket.id}` : '/account/support'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-primary-terracotta)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textDecoration: 'none'
                      }}
                    >
                      View Ticket in Support Messages →
                    </Link>
                  )}
                  <Button variant="outline" onClick={() => { setSubmitted(false); setSubmittedTicket(null); }}>
                    Send Another Message
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
                  Send an Inquiry
                </h3>

                {errorMsg && (
                  <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {errorMsg}
                  </p>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    placeholder="Your Name"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    placeholder="aarav@example.com"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    placeholder="Artisan collaboration / Custom craft order"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Message</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    placeholder="Tell us about your requirements or question..."
                  />
                </div>

                <Button type="submit" variant="primary" icon={Send} loading={submitting} fullWidth>
                  Send Inquiry
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
