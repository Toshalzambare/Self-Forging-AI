import React, { useState } from 'react';
import { APP_NAME, DEMO_USERNAME, DEMO_PASSWORD } from '../config.js';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a tiny async check (swap for real auth later)
    await new Promise(r => setTimeout(r, 600));

    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      onLogin({ username });
    } else {
      setError('Invalid username or password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-container/20 border border-primary/30 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[30px] text-primary material-symbols-fill">auto_awesome</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-on-surface">{APP_NAME}</h1>
            <p className="text-sm text-on-surface-variant mt-1">Sign in to access your AI workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-6 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl pl-9 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-semibold py-2.5 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="text-center text-xs text-on-surface-variant border-t border-outline-variant/20 pt-4">
            Demo credentials: <span className="text-primary font-mono">{DEMO_USERNAME}</span> / <span className="text-primary font-mono">{DEMO_PASSWORD}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
