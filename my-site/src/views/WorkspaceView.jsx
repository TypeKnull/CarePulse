import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  HeartPulseIcon,
  BrainIcon,
  StethoscopeIcon,
  ActivityIcon,
  ShieldAlertIcon,
  LogInIcon,
  SparklesIcon,
  UserIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { PatientDashboard } from '../components/PatientDashboard';
import { DiseasePredictionSuite } from '../components/DiseasePredictionSuite';
import { SymptomChecker } from '../components/SymptomChecker';
import { EmergencyModal } from '../components/EmergencyModal';

export function WorkspaceView() {
  const shouldReduceMotion = useReducedMotion();
  const { user, isDemoMode, logout } = useAuth();
  const { navigate, currentPath } = useNavigation();

  // Determine active tab from URL or fallback
  const getActiveTabFromPath = () => {
    if (currentPath === '/app/predictions' || currentPath === '/app/prediction') return 'predictions';
    if (currentPath === '/app/symptoms') return 'symptoms';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') navigate('/app/dashboard');
    else if (tabId === 'predictions') navigate('/app/predictions');
    else if (tabId === 'symptoms') navigate('/app/symptoms');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tabs = [
    {
      id: 'dashboard',
      label: 'Health Intelligence Hub',
      icon: <ActivityIcon size={18} />,
      kicker: 'Biometric Telemetry & Overview',
    },
    {
      id: 'predictions',
      label: 'ML Disease Risk Suite',
      icon: <BrainIcon size={18} />,
      kicker: 'Predictive Disease Models',
    },
    {
      id: 'symptoms',
      label: 'Symptom Assessment',
      icon: <StethoscopeIcon size={18} />,
      kicker: 'Clinical Triage Direction',
    },
  ];

  return (
    <div className="workspace-layout-root">
      {/* 1. Dedicated Patient Workspace Navigation Header */}
      <header className="workspace-header">
        <div className="container workspace-header-container">
          {/* Left: Brand Identity & Mode Tag */}
          <div className="workspace-brand-group">
            <button
              type="button"
              className="workspace-brand-btn"
              onClick={() => handleTabChange('dashboard')}
            >
              <div className="brand-icon-wrapper">
                <HeartPulseIcon size={22} className="brand-icon" />
              </div>
              <div className="workspace-brand-text">
                <span className="brand-name">CarePulse</span>
                <span className="workspace-label">Patient Workspace</span>
              </div>
            </button>

            {isDemoMode ? (
              <div className="workspace-mode-tag tag-demo">
                <SparklesIcon size={13} />
                <span>Demo Mode (Sample Patient)</span>
              </div>
            ) : (
              <div className="workspace-mode-tag tag-secure">
                <ShieldCheckIcon size={13} />
                <span>Encrypted Patient Record</span>
              </div>
            )}
          </div>

          {/* Center: Top Navigation Tabs */}
          <nav className="workspace-nav" aria-label="Workspace Sections">
            <div className="workspace-tabs-list">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`workspace-tab-btn ${isActive ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    aria-selected={isActive}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                    {isActive && (
                      <motion.div
                        className="tab-active-indicator"
                        layoutId="activeTabUnderline"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Actions & User Menu */}
          <div className="workspace-user-actions">
            <button
              type="button"
              className="emergency-header-btn workspace-emergency-btn"
              onClick={() => setIsEmergencyModalOpen(true)}
              aria-label="Open emergency triage protocols"
            >
              <ShieldAlertIcon size={16} />
              <span>Emergency (112)</span>
            </button>

            <div className="workspace-user-profile-badge">
              <div className="user-avatar-circle">
                <UserIcon size={16} />
              </div>
              <div className="user-meta-group">
                <span className="user-profile-name">
                  {user?.fullName || (isDemoMode ? 'Alex Chen (Demo)' : 'Patient User')}
                </span>
                <span className="user-profile-id">
                  ID: {user?.id || 'P-10492'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-workspace-logout"
              onClick={handleLogout}
              title="Sign Out of Patient Workspace"
            >
              <LogInIcon size={16} style={{ transform: 'rotate(180deg)' }} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Navigation Bar */}
      <div className="workspace-mobile-tab-bar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-tab-btn ${isActive ? 'mobile-tab-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="mobile-tab-icon">{tab.icon}</span>
              <span className="mobile-tab-label">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Dynamic View Content */}
      <main id="workspace-main" className="workspace-main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="view-dashboard"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <PatientDashboard
                onNavigateToMLStudio={() => handleTabChange('predictions')}
                onNavigateToRecords={() => {
                  const el = document.getElementById('health-timeline-title');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onNavigateToDoctorPortal={() => {
                  const el = document.getElementById('upcoming-care-title');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {activeTab === 'predictions' && (
            <motion.div
              key="view-predictions"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <DiseasePredictionSuite
                onNavigateToDoctorBrief={() => handleTabChange('dashboard')}
              />
            </motion.div>
          )}

          {activeTab === 'symptoms' && (
            <motion.div
              key="view-symptoms"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="workspace-symptom-view-wrapper"
            >
              <div className="container">
                <div className="workspace-view-header">
                  <div className="section-badge badge-teal">
                    <StethoscopeIcon size={14} />
                    <span>Interactive Clinical Triage</span>
                  </div>
                  <h1 className="workspace-view-title">Symptom Assessment Studio</h1>
                  <p className="workspace-view-subtitle">
                    Select your symptoms to evaluate clinical urgency, understand possible specialty domains, and prepare doctor consultation notes.
                  </p>
                </div>
              </div>
              <SymptomChecker />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Emergency Guidance Modal Dialog */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
}
