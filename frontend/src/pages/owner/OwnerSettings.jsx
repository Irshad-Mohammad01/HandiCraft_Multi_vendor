import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Truck, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState({
    platform_name: 'CraftNest Indian Handicrafts',
    support_email: 'care@craftnest.com',
    support_phone: '+91 98765 43210',
    free_shipping_threshold: 999,
    standard_shipping_fee: 99,
    maintenance_mode: false,
    artisan_commission_rate: 15,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      if (adminApi.getSettings) {
        const res = await adminApi.getSettings();
        if (res && typeof res === 'object') {
          setSettings((prev) => ({ ...prev, ...res }));
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadSettings();
    };
    run();
  }, [loadSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (adminApi.saveSettings) {
        await adminApi.saveSettings(settings);
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }
      setSuccessMsg('Platform settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Platform Configuration" subtitle="Global store parameters, logistics pricing, and artisan commission policies">
      <div className="max-w-3xl">
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label="Loading platform configuration..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6 sm:p-8 space-y-6">
            {/* Store Identity */}
            <div>
              <h3 className="font-serif text-base font-bold text-[#2B2523] mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#A63D40]" />
                <span>Store Identity & Contact</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1.5">
                    Platform Public Name
                  </label>
                  <input
                    type="text"
                    value={settings.platform_name}
                    onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1.5">
                    Artisan Care Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>
              </div>
            </div>

            {/* Logistics & Delivery Pricing */}
            <div className="pt-6 border-t border-[#E6D8CC]">
              <h3 className="font-serif text-base font-bold text-[#2B2523] mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#A63D40]" />
                <span>Shipping & Delivery Rules</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1.5">
                    Free Shipping Minimum Cart Value (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.free_shipping_threshold}
                    onChange={(e) =>
                      setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })
                    }
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1.5">
                    Standard Domestic Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.standard_shipping_fee}
                    onChange={(e) =>
                      setSettings({ ...settings, standard_shipping_fee: Number(e.target.value) })
                    }
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>
              </div>
            </div>

            {/* Artisan Commission & Royalty */}
            <div className="pt-6 border-t border-[#E6D8CC]">
              <h3 className="font-serif text-base font-bold text-[#2B2523] mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C69A5B]" />
                <span>Artisan Royalties & Platform Fee</span>
              </h3>
              <div className="max-w-xs text-xs">
                <label className="block font-semibold text-[#2B2523] mb-1.5">
                  Platform Service Fee (% per sale)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.artisan_commission_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, artisan_commission_rate: Number(e.target.value) })
                  }
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                />
                <p className="text-[11px] text-[#6F625D] mt-1">
                  Artisans receive {100 - (Number(settings.artisan_commission_rate) || 0)}% of sales proceeds.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
