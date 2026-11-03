import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  HeartPulseIcon,
  LogInIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  AlertTriangleIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export function LoginView() {
  const shouldReduceMotion = useReducedMotion();
  const { login } = useAuth();
  const { navigate } = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isDemoMode) {
        await login({ isDemoMode: true });
        navigate('/app/dashboard');
      } else {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        if (!password) {
          throw new Error('Please enter your account password.');
        }
        const result = await login({ email, password, isDemoMode: false });
        if (result.user?.hasCompletedOnboarding) {
          navigate('/app/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsSubmitting(true);
    try {
      await login({ isDemoMode: true });
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-view-page">
      <motion.div
        className="auth-card-container"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Brand Header */}
        <div className="auth-card-header">
          <div className="auth-brand-badge">
            <HeartPulseIcon size={20} className="brand-icon" />
            <span>CarePulse Patient Workspace</span>
          </div>
          <h1 className="auth-title">Sign In to Your Workspace</h1>
          <p className="auth-subtitle">
            Access your personal health intelligence records, biometric telemetry, and disease prediction suite.
          </p>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertTriangleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isDemoMode && (
            <>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="auth-input-control"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                />
              </div>
            </>
          )}

          {/* Explicit Demo Mode Isolation Callout Box */}
          <div className={`demo-mode-selector-box ${isDemoMode ? 'demo-box-active' : ''}`}>
            <label className="demo-checkbox-label">
              <input
                type="checkbox"
                className="demo-checkbox-input"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
              />
              <div className="demo-checkbox-text">
                <span className="demo-checkbox-title">
                  <SparklesIcon size={14} />
                  <span>Load Sample Patient — Demo Mode</span>
                </span>
                <span className="demo-checkbox-desc">
                  Explore CarePulse using synthetic sample records. Isolated from real patient records.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isSubmitting}
          >
            <LogInIcon size={18} />
            <span>{isSubmitting ? 'Authenticating...' : isDemoMode ? 'Enter Demo Workspace' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Access Button */}
        {!isDemoMode && (
          <div className="auth-divider-wrap">
            <span className="divider-text">or explore directly</span>
            <button
              type="button"
              className="btn-quick-demo"
              onClick={handleQuickDemoLogin}
              disabled={isSubmitting}
            >
              <SparklesIcon size={15} />
              <span>Launch Demo Mode (Sample Patient)</span>
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="auth-card-footer">
          <p className="auth-switch-text">
            Don&apos;t have an account yet?{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => navigate('/register')}
            >
              Create Account <ArrowRightIcon size={13} />
            </button>
          </p>
          <div className="auth-privacy-notice">
            <ShieldCheckIcon size={14} />
            <span>Protected by end-to-end clinical data encryption standards.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
