import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  HeartPulseIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export function RegisterView() {
  const shouldReduceMotion = useReducedMotion();
  const { register } = useAuth();
  const { navigate } = useNavigation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full legal or preferred name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the non-diagnostic clinical terms of use.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ fullName, email, password });
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <span>CarePulse Account Creation</span>
          </div>
          <h1 className="auth-title">Create Your Health Account</h1>
          <p className="auth-subtitle">
            Establish your confidential CarePulse profile to access individualized disease risk models and longitudinal health tracking.
          </p>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertTriangleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Full Legal or Preferred Name
            </label>
            <input
              id="reg-name"
              type="text"
              className="auth-input-control"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address
            </label>
            <input
              id="reg-email"
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

          <div className="dual-form-row">
            <div className="form-group flex-1">
              <label htmlFor="reg-password" className="form-label">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="auth-input-control"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="reg-confirm-password" className="form-label">
                Confirm Password
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                className="auth-input-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-terms-group">
            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                className="terms-checkbox-input"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="terms-text">
                I understand that CarePulse provides informational risk estimates and evidence-based guidance, and does not substitute for clinical emergency care or formal diagnosis.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isSubmitting}
          >
            <SparklesIcon size={18} />
            <span>{isSubmitting ? 'Creating Account...' : 'Continue to Baseline Setup'}</span>
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="auth-card-footer">
          <p className="auth-switch-text">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => navigate('/login')}
            >
              Sign In <ArrowRightIcon size={13} />
            </button>
          </p>
          <div className="auth-privacy-notice">
            <ShieldCheckIcon size={14} />
            <span>All records encrypted and isolated strictly to your account.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
