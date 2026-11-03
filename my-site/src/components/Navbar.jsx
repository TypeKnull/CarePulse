import { useState } from 'react';
import { HeartPulseIcon, ShieldAlertIcon, MenuIcon, XIcon, SparklesIcon, LogInIcon, ActivityIcon } from './Icons';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';

export function Navbar({ onOpenEmergency }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { navigate, currentPath } = useNavigation();
  const { isAuthenticated, logout } = useAuth();

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <button
          type="button"
          className="navbar-brand-btn"
          onClick={() => navigate('/')}
          aria-label="CarePulse Home"
        >
          <div className="brand-icon-wrapper">
            <HeartPulseIcon size={24} className="brand-icon" />
          </div>
          <div className="brand-text-group">
            <span className="brand-name">CarePulse</span>
            <span className="brand-tagline">Precision Health Intelligence</span>
          </div>
        </button>

        {/* Desktop Public Navigation Links */}
        <nav className="navbar-nav desktop-nav" aria-label="Public Navigation">
          <ul className="nav-list">
            <li className="nav-item">
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => handleNavClick('#platform')}
              >
                Platform
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => handleNavClick('#symptoms')}
              >
                Symptom Checker
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => handleNavClick('#how-it-works')}
              >
                How It Works
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => handleNavClick('#features')}
              >
                Capabilities
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => handleNavClick('#safety')}
              >
                Safety &amp; Trust
              </button>
            </li>
          </ul>
        </nav>

        {/* Action Controls */}
        <div className="navbar-actions">
          <button
            type="button"
            className="emergency-header-btn"
            onClick={onOpenEmergency}
            aria-label="Open emergency triage guidance"
          >
            <ShieldAlertIcon size={18} />
            <span className="emergency-btn-text">Emergency (112)</span>
          </button>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="navbar-primary-cta"
                onClick={() => navigate('/app/dashboard')}
              >
                <ActivityIcon size={16} />
                <span>Go to Workspace</span>
              </button>
              <button
                type="button"
                className="btn-public-login"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-public-login"
                onClick={() => navigate('/login')}
              >
                <LogInIcon size={16} />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                className="navbar-primary-cta"
                onClick={() => navigate('/register')}
              >
                <SparklesIcon size={16} />
                <span>Create Account</span>
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="navigation" aria-label="Mobile Navigation">
          <ul className="mobile-nav-list">
            <li className="mobile-nav-item">
              <button
                type="button"
                className="mobile-nav-link-btn"
                onClick={() => handleNavClick('#platform')}
              >
                Platform Overview
              </button>
            </li>
            <li className="mobile-nav-item">
              <button
                type="button"
                className="mobile-nav-link-btn"
                onClick={() => handleNavClick('#symptoms')}
              >
                Symptom Checker
              </button>
            </li>
            <li className="mobile-nav-item">
              <button
                type="button"
                className="mobile-nav-link-btn"
                onClick={() => handleNavClick('#how-it-works')}
              >
                How It Works
              </button>
            </li>
            <li className="mobile-nav-item">
              <button
                type="button"
                className="mobile-nav-link-btn"
                onClick={() => handleNavClick('#features')}
              >
                Clinical Capabilities
              </button>
            </li>
            <li className="mobile-nav-item">
              <button
                type="button"
                className="mobile-nav-link-btn"
                onClick={() => handleNavClick('#safety')}
              >
                Safety &amp; Ethics
              </button>
            </li>
          </ul>
          <div className="mobile-drawer-actions">
            <button
              type="button"
              className="emergency-header-btn mobile-emergency-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenEmergency();
              }}
            >
              <ShieldAlertIcon size={18} />
              <span>Emergency Help (112)</span>
            </button>

            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="navbar-primary-cta mobile-cta-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/app/dashboard');
                  }}
                >
                  <ActivityIcon size={16} />
                  <span>Go to Workspace</span>
                </button>
                <button
                  type="button"
                  className="btn-public-login mobile-login-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('/');
                  }}
                >
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-public-login mobile-login-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  <LogInIcon size={16} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  className="navbar-primary-cta mobile-cta-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  <SparklesIcon size={16} />
                  <span>Create Account</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
