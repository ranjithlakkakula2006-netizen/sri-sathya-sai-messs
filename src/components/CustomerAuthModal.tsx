import React, { useState } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { X, Mail, Lock, User, Phone, Calendar, Gift, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const CustomerAuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    openAuthModal,
    login,
    register,
  } = useCustomerAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotDevLink, setForgotDevLink] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to sign in');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!dob) {
      setError('Please enter your date of birth for birthday offers.');
      return;
    }

    setLoading(true);
    const res = await register({
      full_name: fullName,
      email,
      phone,
      date_of_birth: dob,
      password,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Registration failed');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setDob('');
      setPassword('');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setForgotSent(true);
        setSuccessMsg(data.message);
        if (data.dev_reset_link) {
          setForgotDevLink(data.dev_reset_link);
        }
      } else {
        setError(data.error || 'Could not send reset link');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header with traditional warm styling */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-600/50 border border-amber-300/30 flex items-center justify-center shadow-inner">
              <Gift className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold tracking-wide">Sri Sathya Sai Mess</h3>
              <p className="text-xs text-amber-200/90 font-medium">Customer Portal & Birthday Rewards</p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-amber-200/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (if not forgot password) */}
        {authModalTab !== 'forgot' && (
          <div className="flex border-b border-stone-200 bg-stone-50">
            <button
              onClick={() => { setError(null); openAuthModal('login'); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                authModalTab === 'login'
                  ? 'text-amber-800 border-b-2 border-amber-600 bg-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setError(null); openAuthModal('signup'); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                authModalTab === 'signup'
                  ? 'text-amber-800 border-b-2 border-amber-600 bg-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              Sign Up
            </button>
          </div>
        )}

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {authModalTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('forgot'); }}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              {/* Demo Hint Banner for Fast Testing */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">Quick Test Customer (Birthday Today! 🎂):</p>
                  <p className="text-stone-700 mt-0.5">
                    Email: <span className="font-mono font-medium text-amber-900">rajesh.sharma@example.com</span>
                    <br />
                    Password: <span className="font-mono font-medium text-amber-900">SaiMess@2026</span>
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-amber-800/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In to Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-center text-xs text-stone-500 pt-1">
                New customer?{' '}
                <button
                  type="button"
                  onClick={() => { setError(null); openAuthModal('signup'); }}
                  className="font-semibold text-amber-700 hover:underline"
                >
                  Create an account & get birthday treats!
                </button>
              </p>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {authModalTab === 'signup' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Birthday Club Privilege:</span> Enter your date of birth to receive 20% discount coupons and complimentary sweets on your birthday!
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit number"
                      maxLength={10}
                      className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>Date of Birth *</span>
                    <span className="text-[10px] text-amber-700 font-bold">🎂 Birthday</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="date"
                      required
                      value={dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 uppercase tracking-wider">
                  Create Password * (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-amber-800/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-center text-xs text-stone-500 pt-1">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setError(null); openAuthModal('login'); }}
                  className="font-semibold text-amber-700 hover:underline"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {authModalTab === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                <button
                  type="button"
                  onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('login'); }}
                  className="text-amber-700 hover:underline flex items-center gap-1 font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>

              <div>
                <h4 className="font-serif text-lg font-bold text-stone-800">Reset Customer Password</h4>
                <p className="text-xs text-stone-600 mt-1">
                  Enter your registered email address and we'll send you a secure link to reset your account password.
                </p>
              </div>

              {!forgotSent ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-amber-800/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
                      <CheckCircle2 className="w-4 h-4" /> Password reset instructions sent!
                    </p>
                    <p>Check your email inbox ({forgotEmail}) for instructions.</p>
                  </div>

                  {forgotDevLink && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <p className="font-bold mb-1">Direct Reset Link (Local Testing):</p>
                      <a
                        href={forgotDevLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 underline break-all font-mono"
                      >
                        {forgotDevLink}
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setForgotSent(false);
                      openAuthModal('login');
                    }}
                    className="w-full py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
