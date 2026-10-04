import { useState } from 'react';
import { Lock, Bell, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function SellerSettings() {
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [notifications, setNotifications] = useState({
    email_on_new_order: true,
    sms_on_dispatch: true,
    weekly_sales_digest: true,
  });

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setUpdating(true);
    try {
      await authApi.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccessMsg('Artisan account password updated successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to update password. Please verify current password.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <DashboardLayout title="Artisan Portal Settings" subtitle="Account credentials, security, and notification preferences">
      <div className="max-w-2xl space-y-6">
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#B84242]">
            {errorMsg}
          </div>
        )}

        {/* Password Update Card */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6 sm:p-8">
          <h3 className="font-serif text-base font-bold text-[#2B2523] mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#A63D40]" />
            <span>Change Portal Password</span>
          </h3>

          <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2523] mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center gap-2 py-2 px-5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{updating ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Notifications Preference */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6 sm:p-8">
          <h3 className="font-serif text-base font-bold text-[#2B2523] mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C69A5B]" />
            <span>Fulfillment Notifications</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] cursor-pointer">
              <span>Email alert upon new patron craft order</span>
              <input
                type="checkbox"
                checked={notifications.email_on_new_order}
                onChange={(e) => setNotifications({ ...notifications, email_on_new_order: e.target.checked })}
                className="accent-[#A63D40] w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] cursor-pointer">
              <span>SMS confirmation when parcel dispatched</span>
              <input
                type="checkbox"
                checked={notifications.sms_on_dispatch}
                onChange={(e) => setNotifications({ ...notifications, sms_on_dispatch: e.target.checked })}
                className="accent-[#A63D40] w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] cursor-pointer">
              <span>Weekly workshop payout & earnings digest</span>
              <input
                type="checkbox"
                checked={notifications.weekly_sales_digest}
                onChange={(e) => setNotifications({ ...notifications, weekly_sales_digest: e.target.checked })}
                className="accent-[#A63D40] w-4 h-4"
              />
            </label>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
