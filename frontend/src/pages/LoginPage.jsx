import React, { useState, useEffect, useRef } from 'react';
import { APP_NAME } from '../config.js';
import { authLogin, authSignup, authGoogle } from '../utils/api.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LoginPage = ({ onLogin }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // Form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleScriptReady, setGoogleScriptReady] = useState(false);

  const googleBtnRef = useRef(null);

  // Clear errors when switching tabs
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError('');
  };

  // ── Google Identity Services Initialization ────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load GIS script dynamically if not already loaded
    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleScriptReady(true);
      script.onerror = () => console.warn('Failed to load Google Identity Services SDK');
      document.body.appendChild(script);
    } else {
      setGoogleScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (!googleScriptReady || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: tab === 'login' ? 'signin_with' : 'signup_with',
          shape: 'pill',
          width: '100%',
          logo_alignment: 'left',
        });
      }
    } catch (e) {
      console.error('Google button render error:', e);
    }
  }, [googleScriptReady, tab]);

  const handleGoogleCallback = async (response) => {
    if (!response || !response.credential) {
      setError('No credential returned by Google.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      const user = await authGoogle(response.credential);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Mock Google sign-in for dev testing when offline or without active GCP setup
  const handleMockGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await authGoogle('mock-google-token-demo.user@gmail.com');
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Dev Google login failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Local Form Submission ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'signup') {
      if (!email.trim() || !username.trim() || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }

      setLoading(true);
      try {
        const user = await authSignup(email, username, password);
        onLogin(user);
      } catch (err) {
        setError(err.message || 'Signup failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!loginIdentifier.trim() || !password) {
        setError('Please enter your email/username and password.');
        return;
      }

      setLoading(true);
      try {
        const user = await authLogin(loginIdentifier, password);
        onLogin(user);
      } catch (err) {
        setError(err.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center shadow-xl shadow-indigo-500/10 backdrop-blur-md">
            <span className="material-symbols-outlined text-[32px] text-indigo-400 material-symbols-fill">auto_awesome</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{APP_NAME}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Autonomous AI Agent & Tool Forge Workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Tab Selector */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start space-x-2.5 text-rose-300 text-xs sm:text-sm bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 animate-fadeIn">
              <span className="material-symbols-outlined text-[18px] text-rose-400 flex-shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Google Sign In Area */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-center w-full min-h-[44px]" ref={googleBtnRef}>
              {/* Fallback container or loading placeholder */}
              {googleLoading && (
                <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Connecting to Google...</span>
                </div>
              )}
            </div>

            {/* Dev Mock Google Quick-Login (always available for easy verification) */}
            <button
              type="button"
              onClick={handleMockGoogleLogin}
              disabled={googleLoading}
              className="w-full py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center justify-center space-x-2 group"
              title="Quick test login using Google dev mock identity"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{tab === 'login' ? 'Continue with Google (Dev Demo)' : 'Sign up with Google (Dev Demo)'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">or with email</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'login' ? (
              // Login Fields
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email or Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">person</span>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="name@example.com or username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
            ) : (
              // Sign Up Fields
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      placeholder="alex@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">alternate_email</span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      placeholder="alex_dev"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password {tab === 'signup' && <span className="text-slate-500 font-normal">(min 8 characters)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Enter secure password"
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password (only on Signup) */}
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">verified_user</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>{tab === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {tab === 'signup' ? 'person_add' : 'login'}
                  </span>
                  <span>{tab === 'signup' ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & Multi-Tenancy Assurance Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
          <span className="material-symbols-outlined text-[15px] text-indigo-400">lock</span>
          <span>Secured with dual-token JWT, bcrypt & per-user sandbox isolation</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
