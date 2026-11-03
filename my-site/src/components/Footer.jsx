import { HeartPulseIcon, ShieldAlertIcon, PhoneCallIcon, SparklesIcon } from './Icons';

export function Footer({ onOpenEmergency, setActiveNav }) {
  const handleNav = (id, href) => {
    setActiveNav(id);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="site-footer">
      <div className="container">
        {/* Main Footer Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand & Health Proposition */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <HeartPulseIcon size={22} className="footer-logo-icon" />
              </div>
              <span className="footer-brand-name">CarePulse</span>
            </div>
            <p className="footer-brand-description">
              Precision digital health intelligence designed to help you organize symptoms, understand clinical triage levels, and navigate to the right medical care.
            </p>
            <div className="footer-emergency-badge">
              <PhoneCallIcon size={14} />
              <span>National Emergency Services: 112</span>
            </div>
          </div>

          {/* Col 2: Platform Navigation */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Platform Navigation</h4>
            <ul className="footer-links-list">
              <li>
                <a href="#home" onClick={(e) => { e.preventDefault(); handleNav('home', '#home'); }}>
                  Home Overview
                </a>
              </li>
              <li>
                <a href="#symptoms" onClick={(e) => { e.preventDefault(); handleNav('symptoms', '#symptoms'); }}>
                  Symptom Checker
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => { e.preventDefault(); handleNav('how-it-works', '#how-it-works'); }}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); handleNav('features', '#features'); }}>
                  Care Capabilities
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Clinical & Safety Resources */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Safety &amp; Guidance</h4>
            <ul className="footer-links-list">
              <li>
                <a href="#emergency-guidance" onClick={(e) => { e.preventDefault(); handleNav('emergency-hub', '#emergency-guidance'); }}>
                  Emergency Guidance Hub
                </a>
              </li>
              <li>
                <a href="#safety" onClick={(e) => { e.preventDefault(); handleNav('safety', '#safety'); }}>
                  Ethical Standards &amp; Safety
                </a>
              </li>
              <li>
                <a href="#symptoms" onClick={(e) => { e.preventDefault(); handleNav('symptoms', '#symptoms'); }}>
                  Doctor Consultation Preparation
                </a>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-emergency-link"
                  onClick={onOpenEmergency}
                >
                  <ShieldAlertIcon size={14} />
                  <span>Open Emergency Protocol (112)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Standards */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Clinical Integrity</h4>
            <p className="footer-compliance-text">
              Built in accordance with evidence-informed triage principles to provide clear educational health direction and empower patient-physician conversations.
            </p>
            <div className="footer-status-tag">
              <SparklesIcon size={14} />
              <span>Evidence-Informed Healthcare</span>
            </div>
          </div>
        </div>

        {/* Bottom Legal / Medical Disclaimer Bar */}
        <div className="footer-legal-bar">
          <p className="footer-legal-disclaimer">
            <strong>Medical Notice:</strong> CarePulse is an educational health guidance platform and not a medical device, diagnostic system, or provider of clinical medical care. In case of acute health symptoms or life-threatening emergencies, contact national emergency response (112) or visit the nearest hospital emergency department immediately.
          </p>
          <div className="footer-copyright-row">
            <span>© {new Date().getFullYear()} CarePulse Health Platform. All rights reserved.</span>
            <span>Dedicated to Accessible Clinical Trust &amp; Patient Wellbeing.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
