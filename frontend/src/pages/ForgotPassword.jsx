import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle2, Copy, Check, Clock, RotateCcw, Sparkles } from 'lucide-react';
import authApi from '../api/auth';
import Button from '../components/common/Button';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // Countdown timer for reset OTP expiry
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyOtp = () => {
    if (devOtp) {
      navigator.clipboard.writeText(devOtp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage('');
    setSuccessMessage('');
    setDevOtp('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.success || res.dev_otp) {
        setStep(2);
        setTimeLeft(300);
        setSuccessMessage(res.message || 'Password reset code has been generated.');
        if (res.dev_otp || res.otp) {
          const code = String(res.dev_otp || res.otp);
          setDevOtp(code);
        }
      } else {
        setErrorMessage(res.message || 'Failed to generate reset code.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending) return;
    setErrorMessage('');
    setResending(true);
    try {
      const res = await authApi.resendResetOtp(email.trim());
      if (res.success || res.dev_otp) {
        setTimeLeft(300);
        setSuccessMessage(res.message || 'New reset code generated.');
        if (res.dev_otp || res.otp) {
          const code = String(res.dev_otp || res.otp);
          setDevOtp(code);
        }
      } else {
        setErrorMessage(res.message || 'Failed to resend code.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage('');

    if (!otp.trim() || !newPassword) {
      setErrorMessage('Please enter the OTP and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Verification code has expired. Please request a new OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        password: newPassword,
      });

      if (res.success || res.message?.includes('success')) {
        setSuccessMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Password reset failed. Invalid or expired OTP.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Password reset failed. Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF9F3]">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] craft-card-shadow">
              <Sparkles className="w-6 h-6 text-[#A63D40]" />
            </div>
          </Link>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-[#2B2523]">
            {step === 1 ? 'Reset Password' : 'Set New Password'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#6F625D]">
            {step === 1
              ? 'Enter your registered email to receive a password reset code'
              : 'Enter verification code and your new password'}
          </p>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-[#E6D8CC] craft-card-shadow">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242]">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                  <Mail className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-4"
              >
                <span>Send Reset Code</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* DEV OTP Highlighted Box */}
              {devOtp && (
                <div className="p-4 rounded-2xl bg-[#FFF8EE] border-2 border-[#E67E22] text-center space-y-2 craft-card-shadow">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-[#E65100] text-white text-[10px] font-extrabold tracking-wider uppercase">
                    DEV MODE — PASSWORD RESET OTP
                  </div>
                  <div className="text-xs text-[#6F625D]">
                    Your development verification code is:
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#F39C12]/40 flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl font-extrabold tracking-[0.3em] text-[#E65100]">
                      {devOtp}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="p-1.5 rounded-lg border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-white text-[#6F625D] hover:text-[#A63D40] transition-colors"
                      title="Copy OTP"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="font-bold text-[#A63D40] hover:text-[#802D30] underline cursor-pointer"
                    >
                      Auto-Fill Code
                    </button>
                    <span className="text-[#E6D8CC]">|</span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="font-bold text-[#6F625D] hover:text-[#2B2523] cursor-pointer"
                    >
                      {copied ? 'Copied to Clipboard!' : 'Copy OTP'}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Expiry Countdown */}
              <div className="flex items-center justify-between px-1 text-xs text-[#6F625D]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#E67E22]" />
                  <span>Code expires in:</span>
                </div>
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-[#2B2523]'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl py-2.5 border border-[#E6D8CC] rounded-xl bg-[#FFF9F3] focus:bg-white focus:border-[#A63D40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                  <Lock className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={timeLeft <= 0}
                className="w-full mt-2"
              >
                <span>Update Password</span>
              </Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#A63D40] hover:text-[#802D30] disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#6F625D] hover:text-[#A63D40]"
                >
                  ← Edit email
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#E6D8CC] text-center">
            <Link to="/login" className="text-xs font-semibold text-[#A63D40] hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
