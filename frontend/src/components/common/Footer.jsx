import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, HeartHandshake, Truck, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export const Footer = () => {
  const { settings } = useSettings();

  return (
    <footer className="bg-white border-t border-[#E6D8CC] text-[#2B2523] mt-20">
      {/* Artisan Value Badges */}
      <div className="border-b border-[#E6D8CC] bg-[#FFF9F3]">
        <div className="craft-container py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-1">Hereditary Mastercraft</h4>
                <p className="text-xs text-[#6F625D] leading-relaxed">
                  Direct sourcing from GI-tagged clusters and registered master artisan cooperatives.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-1">Fair Artisan Trade</h4>
                <p className="text-xs text-[#6F625D] leading-relaxed">
                  Empowering rural weaver and craft families with equitable pricing and zero middlemen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-1">Insured Safe Transit</h4>
                <p className="text-xs text-[#6F625D] leading-relaxed">
                  Specialized multi-layer shockproof packaging for delicate pottery, brass, and woodwork.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-1">Authenticity Guaranteed</h4>
                <p className="text-xs text-[#6F625D] leading-relaxed">
                  Every product carries a verified certificate of artisan origin and natural craft medium.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="craft-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
                <Sparkles className="w-5 h-5 text-[#A63D40]" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-wider text-[#2B2523]">
                {settings?.platform_name ? (
                  settings.platform_name.split(' ')[0]
                ) : (
                  'CRAFT'
                )}
                <span className="text-[#A63D40]">
                  {settings?.platform_name && settings.platform_name.split(' ').length > 1
                    ? ' ' + settings.platform_name.split(' ').slice(1).join(' ')
                    : 'NEST'}
                </span>
              </span>
            </Link>
            <p className="text-sm text-[#6F625D] leading-relaxed max-w-sm">
              {settings?.platform_name || 'CraftNest'} is India's dedicated platform for authentic handcrafted arts, traditional textiles, earthen pottery, and heirloom brassware celebrating centuries of living artistic traditions.
            </p>
            <div className="pt-2 text-xs text-[#6F625D] space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#A63D40] shrink-0 mt-0.5" />
                <span>{settings?.business_address || 'CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#A63D40] shrink-0" />
                <a href={`mailto:${settings?.support_email || 'care@craftnest.in'}`} className="hover:text-[#A63D40] transition-colors">
                  {settings?.support_email || 'care@craftnest.in'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#A63D40] shrink-0" />
                <span>
                  {settings?.support_phone || '+91 141 256 7890'} {settings?.working_hours ? `(${settings.working_hours})` : ''}
                </span>
              </div>
            </div>

            {/* Social Media Link Icons */}
            {(settings?.social_instagram || settings?.social_facebook || settings?.social_youtube || settings?.social_twitter) && (
              <div className="pt-2 flex items-center gap-2.5">
                {settings?.social_instagram && (
                  <a
                    href={settings.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] hover:bg-[#A63D40] hover:text-white transition-colors text-[11px] font-bold"
                    title="Instagram"
                  >
                    IG
                  </a>
                )}
                {settings?.social_facebook && (
                  <a
                    href={settings.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] hover:bg-[#A63D40] hover:text-white transition-colors text-[11px] font-bold"
                    title="Facebook"
                  >
                    FB
                  </a>
                )}
                {settings?.social_youtube && (
                  <a
                    href={settings.social_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] hover:bg-[#A63D40] hover:text-white transition-colors text-[11px] font-bold"
                    title="YouTube"
                  >
                    YT
                  </a>
                )}
                {settings?.social_twitter && (
                  <a
                    href={settings.social_twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] hover:bg-[#A63D40] hover:text-white transition-colors text-[11px] font-bold"
                    title="X / Twitter"
                  >
                    X
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2B2523] uppercase tracking-wider mb-4">Craft Traditions</h4>
            <ul className="space-y-2.5 text-xs text-[#6F625D]">
              <li><Link to="/products?category=Pottery+%26+Terracotta" className="hover:text-[#A63D40] transition-colors">Pottery & Terracotta</Link></li>
              <li><Link to="/products?category=Handloom+%26+Textiles" className="hover:text-[#A63D40] transition-colors">Handloom & Textiles</Link></li>
              <li><Link to="/products?category=Wooden+Crafts" className="hover:text-[#A63D40] transition-colors">Wooden Carvings</Link></li>
              <li><Link to="/products?category=Brass+%26+Metalware" className="hover:text-[#A63D40] transition-colors">Brass & Metalware</Link></li>
              <li><Link to="/products?category=Marble+Inlay+%26+Stonework" className="hover:text-[#A63D40] transition-colors">Marble Inlay Work</Link></li>
              <li><Link to="/products?category=Traditional+Folk+Paintings" className="hover:text-[#A63D40] transition-colors">Traditional Folk Art</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2B2523] uppercase tracking-wider mb-4">Customer Care</h4>
            <ul className="space-y-2.5 text-xs text-[#6F625D]">
              <li><Link to="/contact" className="hover:text-[#A63D40] transition-colors font-medium">Customer Care & Inquiries</Link></li>
              <li><Link to="/orders" className="hover:text-[#A63D40] transition-colors">Track Your Order</Link></li>
              <li><Link to="/faq" className="hover:text-[#A63D40] transition-colors">Help & FAQs</Link></li>
              <li><Link to="/cart" className="hover:text-[#A63D40] transition-colors">Shopping Cart</Link></li>
              <li><Link to="/wishlist" className="hover:text-[#A63D40] transition-colors">Artisan Wishlist</Link></li>
              <li><Link to="/account" className="hover:text-[#A63D40] transition-colors">My Profile & Addresses</Link></li>
            </ul>
          </div>

          {/* Portal Access */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2B2523] uppercase tracking-wider mb-4">Platform Portal</h4>
            <ul className="space-y-2.5 text-xs text-[#6F625D]">
              <li><Link to="/login" className="hover:text-[#A63D40] transition-colors">Artisan & Member Login</Link></li>
              <li><Link to="/register" className="hover:text-[#A63D40] transition-colors">Customer Registration</Link></li>
              <li><Link to="/contact" className="hover:text-[#A63D40] transition-colors">Artisan Guild Inquiries</Link></li>
              <li><Link to="/products" className="hover:text-[#A63D40] transition-colors">Explore All Catalog</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="border-t border-[#E6D8CC] bg-[#FFF9F3] py-6 text-center text-xs text-[#6F625D]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CRAFTNEST E-Commerce Platform. All rights reserved.</p>
          <p className="text-[#C69A5B] font-serif italic">Dedicated to the timeless heritage of Indian handicraft artisans.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
