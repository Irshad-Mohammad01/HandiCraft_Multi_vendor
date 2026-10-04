import React from 'react';
import { ShieldCheck, HeartHandshake, Sparkles, Award } from 'lucide-react';

export default function About() {
  return (
    <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '100vh', padding: '48px 0 80px' }}>
      <div className="container">
        {/* Hero Section */}
        <div style={{ maxWidth: '800px', margin: '0 auto 60px', textAlign: 'center' }}>
          <span style={{ 
            color: 'var(--color-heritage-gold)', 
            fontWeight: 700, 
            letterSpacing: '2px', 
            fontSize: '0.85rem',
            textTransform: 'uppercase' 
          }}>
            Our Living Heritage
          </span>
          <h1 style={{ 
            fontFamily: 'Playfair Display, serif', 
            fontSize: '2.5rem', 
            color: 'var(--color-primary-terracotta)',
            margin: '12px 0 20px',
            lineHeight: 1.2
          }}>
            Connecting Indian Artisans With the World
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', lineHeight: 1.8 }}>
            CraftNest was born out of a profound reverence for India's rich artisanal heritage. Every terracotta vessel, handwoven textile, brass idol, and wooden carving carries generations of ancestral wisdom and culture.
          </p>
        </div>

        {/* Values Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '32px',
          marginBottom: '64px'
        }}>
          {[
            {
              icon: HeartHandshake,
              title: 'Fair Artisan Compensation',
              description: 'We bypass unfair middlemen, ensuring master craftsmen and rural artisan cooperatives receive direct and dignified financial remuneration.'
            },
            {
              icon: ShieldCheck,
              title: '100% Authentic Provenance',
              description: 'Every handicraft is certified for its traditional craft lineage, natural raw materials, and geographical craft origins across India.'
            },
            {
              icon: Sparkles,
              title: 'Eco-Conscious & Sustainable',
              description: 'Our artisans use earthen clays, vegetable dyes, sustainable timber, and biodegradable materials to keep our planet green.'
            },
            {
              icon: Award,
              title: 'Preserving Vanishing Guilds',
              description: 'By supporting CraftNest, you directly keep rare and endangered artistic traditions vibrant for centuries to come.'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--color-white)',
                  padding: '32px 24px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-soft-beige)',
                  color: 'var(--color-primary-terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Icon size={28} />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quote Section */}
        <div style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <blockquote style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.35rem',
            fontStyle: 'italic',
            color: 'var(--color-primary-terracotta)',
            margin: '0 0 16px 0',
            lineHeight: 1.6
          }}>
            "Handicraft is not merely an object; it is the living breath of our ancestors, shaped by human hands and timeless devotion."
          </blockquote>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            The CraftNest Collective
          </div>
        </div>
      </div>
    </div>
  );
}
