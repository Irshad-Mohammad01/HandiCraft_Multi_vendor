import { useState } from 'react';
import { MapPin, Award, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function SellerProfile() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || user?.mobile || '',
    studio_name: user?.studio_name || `${user?.name || user?.username || 'Master'} Heritage Workshop`,
    craft_tradition: user?.craft_tradition || 'Jaipur Blue Pottery & Heritage Claycraft',
    region: user?.region || 'Rajasthan, India',
    bio: user?.bio || 'Preserving centuries-old handicraft traditions using natural clays, mineral pigments, and kiln-firing techniques handed down through generations.',
    bank_account: user?.bank_account || '••••••••4829 (State Bank of India)',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await authApi.updateProfile({
        name: formData.name,
        phone: formData.phone,
        studio_name: formData.studio_name,
        craft_tradition: formData.craft_tradition,
        region: formData.region,
        bio: formData.bio,
      });

      if (res?.user) {
        updateUser(res.user);
      }
      setSuccessMsg('Artisan studio profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update artisan profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Master Artisan Profile" subtitle="Your artisan biography, verified craft lineage, and studio verification details">
      <div className="max-w-3xl">
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#B84242]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6 sm:p-8 space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-4 pb-6 border-b border-[#E6D8CC]">
            <div className="w-16 h-16 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-2xl shrink-0">
              {(formData.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2B2523] flex items-center gap-2">
                <span>{formData.studio_name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F4E8DC] text-[#A63D40] text-[10px] font-bold uppercase tracking-wider">
                  Verified Artisan
                </span>
              </h2>
              <p className="text-xs text-[#6F625D] mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C69A5B]" />
                <span>{formData.region}</span>
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Artisan Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Studio / Workshop Name
              </label>
              <input
                type="text"
                required
                value={formData.studio_name}
                onChange={(e) => setFormData({ ...formData, studio_name: e.target.value })}
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Registered Contact Email
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full bg-[#FFF9F3]/60 border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#6F625D] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Workshop Mobile Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Craft Tradition & Specialty
              </label>
              <input
                type="text"
                value={formData.craft_tradition}
                onChange={(e) => setFormData({ ...formData, craft_tradition: e.target.value })}
                placeholder="e.g. Saharanpur Rosewood Carvings, Banarasi Handlooms"
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Artisan Heritage Biography
              </label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Describe your craft lineage, regional materials, and techniques..."
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>
          </div>

          {/* Payout Information */}
          <div className="pt-6 border-t border-[#E6D8CC] space-y-2 text-xs">
            <h3 className="font-serif text-sm font-bold text-[#2B2523] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C69A5B]" />
              <span>Direct Artisan Settlement Account</span>
            </h3>
            <p className="text-[#6F625D]">
              Earnings are directly transferred weekly: <span className="font-mono font-semibold text-[#2B2523]">{formData.bank_account}</span>
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Update Artisan Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
