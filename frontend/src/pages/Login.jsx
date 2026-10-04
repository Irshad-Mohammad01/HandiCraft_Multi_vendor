import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectParam = new URLSearchParams(location.search).get('redirect');

  // Customer destination helper: Always Home Page ('/'), never '/account' automatically
  // (Preserves in-progress checkout only if user came from checkout)
  const getCustomerDestination = () => {
    const fromPath = location.state?.from?.pathname || redirectParam;
    if (fromPath && fromPath.startsWith('/checkout')) {
      return fromPath;
    }
    return '/';
  };

  // If already logged in, redirect to their appropriate role portal
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'owner' || role === 'admin') {
        navigate('/owner/dashboard', { replace: true });
      } else if (role === 'sub_owner') {
        navigate('/sub-owner/dashboard', { replace: true });
      } else if (role === 'seller') {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate(getCustomerDestination(), { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email, username, or mobile number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);

      if (result && result.success) {
        // Backend determines the authenticated role
        const userRole = result.role;

        if (userRole === 'owner' || userRole === 'admin') {
          navigate('/owner/dashboard', { replace: true });
        } else if (userRole === 'sub_owner') {
          navigate('/sub-owner/dashboard', { replace: true });
        } else if (userRole === 'seller') {
          navigate('/seller/dashboard', { replace: true });
        } else {
          // Customer / User -> Main Website Home Page ('/')
          navigate(getCustomerDestination(), { replace: true });
        }
      } else {
        setErrorMessage(result?.message || 'Invalid email/username or password. Please verify your credentials.');
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF9F3]">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group" aria-label="CraftNest Home">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6D8CC] flex items-center justify-center text-2xl text-[#A63D40] craft-card-shadow">
              <Sparkles className="w-6 h-6 text-[#A63D40]" />
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2B2523]">
            Welcome Back
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#6F625D]">
            Sign in to access your CraftNest patron account or management portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E6D8CC] craft-card-shadow">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-start gap-2.5">
              <span className="text-sm font-bold shrink-0">✕</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier Input (Email, Username, or Mobile) */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold text-[#2B2523] mb-1.5"
              >
                Email, Username, or Mobile Number
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. customer@craftnest.com or owner"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#2B2523] placeholder-[#6F625D]/60 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40]"
                />
                <Mail className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#2B2523]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#A63D40] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-10 text-sm text-[#2B2523] placeholder-[#6F625D]/60 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40]"
                />
                <Lock className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F625D] hover:text-[#2B2523] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button with Loading State */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              className="w-full mt-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to CraftNest'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 pt-6 border-t border-[#E6D8CC] text-center">
            <p className="text-xs text-[#6F625D]">
              New to CraftNest?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#A63D40] hover:underline"
              >
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
