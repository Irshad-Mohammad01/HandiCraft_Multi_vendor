import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle2, Copy, Check, Clock, RotateCcw, Sparkles } from 'lucide-react';
import authApi from '../api/auth';
import Button from '../components/common/Button';

export const Register = () => {
  const navigate = useNavigate();

  // Step 1: Registration Form Details; Step 2: OTP Verification
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Format seconds into MM:SS
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage('');
    setSuccessMessage('');
    setDevOtp('');

    if (!name.trim() || !email.trim() || !mobile.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (mobile.trim().length !== 10 || !/^\d+$/.test(mobile.trim())) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendRegistrationOtp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password: password,
      });

      if (res.success || res.dev_otp) {
        setStep(2);
        setTimeLeft(300);
        setSuccessMessage(res.message || 'Verification code generated successfully.');
        if (res.dev_otp || res.otp) {
          const code = String(res.dev_otp || res.otp);
          setDevOtp(code);
        }
      } else {
        setErrorMessage(res.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Registration request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending) return;
    setErrorMessage('');
    setResending(true);
    try {
      const res = await authApi.resendRegistrationOtp(email.trim().toLowerCase());
      if (res.success || res.dev_otp) {
        setTimeLeft(300);
        setSuccessMessage(res.message || 'New verification code generated.');
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage('');

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Verification code has expired. Please request a new OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyRegistrationOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (res.token || res.user || res.message?.includes('successful') || res.success) {
        setSuccessMessage('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'OTP verification failed.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired verification code.');
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
            {step === 1 ? 'Join CraftNest' : 'Verify Your Email'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#6F625D]">
            {step === 1
              ? 'Create an account to begin your handicraft journey'
              : 'Enter the verification code to activate your customer account'}
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
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                  <User className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  Email Address
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

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                  <Phone className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full mt-4"
              >
                <span>Continue & Verify OTP</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center p-3 bg-[#FFF9F3] rounded-xl border border-[#E6D8CC] text-xs text-[#6F625D]">
                Verification code for: <strong className="text-[#2B2523]">{email}</strong>
              </div>

              {/* DEV OTP Highlighted Box */}
              {devOtp && (
                <div className="p-4 rounded-2xl bg-[#FFF8EE] border-2 border-[#E67E22] text-center space-y-2 craft-card-shadow">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-[#E65100] text-white text-[10px] font-extrabold tracking-wider uppercase">
                    DEV MODE — OTP TEST CODE
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
                <label className="block text-xs font-semibold text-[#2B2523] mb-1.5 text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono font-bold text-2xl py-3 border border-[#E6D8CC] rounded-xl bg-[#FFF9F3] focus:bg-white focus:border-[#A63D40]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={timeLeft <= 0}
                className="w-full"
              >
                Verify & Create Account
              </Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#A63D40] hover:text-[#802D30] disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>Resend OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#6F625D] hover:text-[#A63D40]"
                >
                  ← Edit details
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#E6D8CC] text-center">
            <p className="text-xs text-[#6F625D]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#A63D40] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
