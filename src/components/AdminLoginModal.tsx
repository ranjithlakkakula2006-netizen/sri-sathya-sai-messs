import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  initialResetToken?: string | null;
}

type ViewMode = 'login' | 'forgot_password' | 'reset_password';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialResetToken,
}) => {
  const { login } = useAuth();

  // Mode & navigation
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [devToken, setDevToken] = useState('');

  // Reset password state
  const [resetToken, setResetToken] = useState<string>('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerificationError, setTokenVerificationError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Check for reset_token query parameter or prop
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('reset_token') || initialResetToken;

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setViewMode('reset_password');
      verifyToken(tokenFromUrl);
    }
  }, [isOpen, initialResetToken]);

  // Verify reset token with server
  const verifyToken = async (token: string) => {
    setIsVerifyingToken(true);
    setTokenVerificationError('');
    try {
      const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setVerifiedEmail(data.email || 'Registered Owner');
      } else {
        setTokenVerificationError(
          data.error || 'Password reset link is invalid or has expired. Please request a new one.'
        );
      }
    } catch {
      setTokenVerificationError('Could not verify reset link. Please check your connection and try again.');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  if (!isOpen) return null;

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    const res = await login(email, password);
    setIsLoginLoading(false);

    if (res.success) {
      onLoginSuccess();
      onClose();
    } else {
      setLoginError(res.error || 'Authentication failed. Please check your email and password.');
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccessMessage('');
    setDevResetLink('');
    setDevToken('');

    const cleanEmail = forgotEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setForgotError('Please enter a valid email address format (e.g. name@example.com)');
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      setIsForgotLoading(false);

      if (res.ok) {
        setForgotSuccessMessage(
          data.message || 'If an account exists for this email, password reset instructions will be sent.'
        );
        if (data.dev_reset_link) {
          setDevResetLink(data.dev_reset_link);
          setDevToken(data.dev_token);
        }
      } else {
        setForgotError(data.error || 'Could not send password reset email. Please try again.');
      }
    } catch {
      setIsForgotLoading(false);
      setForgotError('Network connection issue. Please check your internet connection.');
    }
  };

  // Handle Reset Password submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long for security.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      setIsResettingPassword(false);

      if (res.ok) {
        setResetSuccess(true);
        // Clean URL search param without full reload
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, '', url.toString());
      } else {
        setResetError(data.error || 'Password reset failed. The link may have expired or was already used.');
      }
    } catch {
      setIsResettingPassword(false);
      setResetError('Network error while resetting password. Please try again.');
    }
  };

  const handleFillDemoCredentials = () => {
    setEmail('ranjithlakkakula2006@gmail.com');
    setPassword('srisaimess@2023');
  };

  const handleReturnToLogin = () => {
    setViewMode('login');
    setForgotError('');
    setForgotSuccessMessage('');
    setResetError('');
    setResetSuccess(false);
    setNewPassword('');
    setConfirmPassword('');
    setTokenVerificationError('');
    // Remove query param if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('reset_token')) {
      url.searchParams.delete('reset_token');
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="p-6 bg-stone-900 text-stone-100 border-b border-stone-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {viewMode === 'login' && (
            <>
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 block">
                Authorized Personnel Only
              </span>
              <h2 className="text-xl font-serif font-bold text-white">Owner Admin Login</h2>
              <p className="text-xs text-stone-400 mt-1">
                Access real-time kitchen orders, menu management, and sales reports.
              </p>
            </>
          )}

          {viewMode === 'forgot_password' && (
            <>
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 block">
                Account Recovery
              </span>
              <h2 className="text-xl font-serif font-bold text-white">Reset Owner Password</h2>
              <p className="text-xs text-stone-400 mt-1">
                Verify your registered email to receive secure password reset instructions.
              </p>
            </>
          )}

          {viewMode === 'reset_password' && (
            <>
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 block">
                Security Verification
              </span>
              <h2 className="text-xl font-serif font-bold text-white">Set New Password</h2>
              <p className="text-xs text-stone-400 mt-1">
                Choose a strong new password for your Sri Sathya Sai Mess owner account.
              </p>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: LOGIN FORM */}
        {/* ========================================================================= */}
        {viewMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Owner Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  placeholder="ranjithlakkakula2006@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Clearly Visible Forgot Password Link */}
            <div className="flex items-center justify-between text-xs pt-0.5 pb-0.5">
              <span className="text-[11px] text-stone-500">Need help accessing?</span>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email || 'ranjithlakkakula2006@gmail.com');
                  setForgotError('');
                  setForgotSuccessMessage('');
                  setViewMode('forgot_password');
                }}
                className="text-amber-800 hover:text-amber-900 font-bold hover:underline cursor-pointer transition-colors text-xs flex items-center gap-1"
              >
                <span>Forgot Password?</span>
              </button>
            </div>

            {/* Quick preview demo credentials helper */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">Configured credentials:</span>
              <button
                type="button"
                onClick={handleFillDemoCredentials}
                className="text-amber-800 font-bold hover:underline text-[11px] cursor-pointer"
              >
                Fill Credentials
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FORGOT PASSWORD FORM */}
        {/* ========================================================================= */}
        {viewMode === 'forgot_password' && (
          <div className="p-6 space-y-4">
            {forgotSuccessMessage ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-stone-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Instructions Sent</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    {forgotSuccessMessage}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    The reset link will remain valid for <strong>30 minutes</strong> and is strictly single-use. Please check your inbox and spam folder.
                  </p>
                </div>

                {/* Instant Testing Helper for when SMTP is not yet configured */}
                {devResetLink && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                        Quick Testing Link
                      </span>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-mono">
                        Direct Access
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      You can test the password reset flow directly using the generated single-use token:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResetToken(devToken);
                        setViewMode('reset_password');
                        verifyToken(devToken);
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Reset Password Screen Now</span>
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReturnToLogin}
                    className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Owner Admin Login</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Registered Owner Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      placeholder="ranjithlakkakula2006@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Password reset instructions will only be sent to the verified restaurant owner email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isForgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-2 text-stone-600 hover:text-stone-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: RESET PASSWORD FORM */}
        {/* ========================================================================= */}
        {viewMode === 'reset_password' && (
          <div className="p-6 space-y-4">
            {isVerifyingToken ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs text-stone-600 font-medium">
                  Verifying single-use security token...
                </p>
              </div>
            ) : tokenVerificationError ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <span>Reset Link Invalid or Expired</span>
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {tokenVerificationError}
                  </p>
                  <p className="text-[11px] text-red-600">
                    For strict security against unauthorized access, all reset links expire after 30 minutes and can only be used once.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_password');
                      setForgotError('');
                      setForgotSuccessMessage('');
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Request New Reset Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReturnToLogin}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Owner Login</span>
                  </button>
                </div>
              </div>
            ) : resetSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900">
                    Password Successfully Reset!
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                    Your owner admin password has been updated. All previous active sessions have been securely terminated.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 text-left">
                  <div className="text-[11px] font-semibold text-stone-700 mb-0.5">
                    Account: <span className="font-mono text-stone-900">{verifiedEmail || 'Owner Account'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    &bull; Status: Ready to log in with your new password
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Return to Owner Admin Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                {verifiedEmail && (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-stone-500 text-[11px]">Resetting for:</span>
                    <span className="font-mono font-semibold text-stone-800 text-[11px]">
                      {verifiedEmail}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] font-medium ${
                        newPassword.length >= 8 ? 'text-emerald-600' : 'text-stone-400'
                      }`}
                    >
                      {newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="mt-1 text-[10px] font-medium">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-600">✓ Passwords match</span>
                      ) : (
                        <span className="text-red-500">✗ Passwords do not match</span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Reset Password & Secure Account</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-2 text-stone-600 hover:text-stone-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Cancel & Back to Login</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
