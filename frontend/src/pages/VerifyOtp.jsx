import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../context/AuthContext';
import Button from '../components/common/Button';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const initialDevOtp = location.state?.dev_otp || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !otp.trim()) {
      setErrorMessage('Please provide both your registered email and the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        email: email.trim(),
        otp: otp.trim(),
      });

      setSuccessMessage(res.data?.message || 'Verification successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Verification failed. The code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email.trim()) return;
    setResending(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/resend-otp`, {
        email: email.trim(),
      });
      if (res.data?.dev_otp) {
        setDevOtp(res.data.dev_otp);
      }
      setSuccessMessage(res.data?.message || 'New OTP has been dispatched.');
      setCountdown(60);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF9F3]">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] craft-card-shadow">
              <Sparkles className="w-6 h-6 text-[#A63D40]" />
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2B2523]">
            Verify Your Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#6F625D]">
            Enter the 6-digit verification code sent to your registered email address
          </p>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E6D8CC] craft-card-shadow">
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

          {devOtp && (
            <div className="mb-6 p-4 rounded-2xl bg-[#FFF8EE] border-2 border-[#E67E22] text-center space-y-1.5 craft-card-shadow">
              <div className="inline-block px-3 py-0.5 rounded-full bg-[#E65100] text-white text-[10px] font-extrabold tracking-wider uppercase">
                DEV MODE — OTP TEST CODE
              </div>
              <div className="text-xs text-[#6F625D] pt-1">Verification Code</div>
              <div className="text-sm font-medium text-[#2B2523]">
                Your OTP is: <span className="font-mono text-2xl font-bold tracking-widest text-[#E65100] ml-1">{devOtp}</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="text-xs font-bold text-[#A63D40] hover:text-[#802D30] underline cursor-pointer"
                >
                  Click to Auto-Fill Code
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patron@example.com"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] placeholder-[#6F625D]/60 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40]"
                />
                <Mail className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-center tracking-widest text-lg font-mono font-semibold text-[#2B2523] placeholder-[#6F625D]/40 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40]"
                />
                <KeyRound className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              className="w-full mt-2"
            >
              <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E6D8CC] flex items-center justify-between text-xs text-[#6F625D]">
            <span>Didn't receive code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending || !email.trim()}
              className="font-semibold text-[#A63D40] hover:underline disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
