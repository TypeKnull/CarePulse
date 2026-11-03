import { ShieldCheckIcon, BookOpenIcon, AlertTriangleIcon, LockIcon } from './Icons';

export function TrustSafety({ onOpenEmergency }) {
  return (
    <section id="safety" className="trust-safety-section section-padding">
      <div className="container">
        {/* Section Header */}
        <div className="section-header-center">
          <div className="section-badge badge-trust">
            <ShieldCheckIcon size={16} />
            <span>Ethical Standards &amp; Safety</span>
          </div>
          <h2 className="section-title">Patient Trust &amp; Clinical Responsibility</h2>
          <p className="section-subtitle">
            CarePulse is designed to support and empower you, with clear clinical boundaries prioritizing your health and safety above all else.
          </p>
        </div>

        {/* 3 Safety Pillars Grid */}
        <div className="trust-safety-grid">
          {/* Card 1: Not a Diagnosis */}
          <div className="safety-card">
            <div className="safety-card-header">
              <div className="safety-icon-wrapper info-icon">
                <ShieldCheckIcon size={24} />
              </div>
              <div>
                <span className="safety-card-kicker">Educational Boundaries</span>
                <h3 className="safety-card-title">Not a Medical Diagnosis</h3>
              </div>
            </div>
            <p className="safety-card-body">
              CarePulse provides educational triage insights and organized consultation summaries. It does not replace a clinical examination, diagnostic lab work, or the personal judgment of a licensed physician.
            </p>
            <div className="safety-card-tag">
              <span>Physician-Centered Care</span>
            </div>
          </div>

          {/* Card 2: Privacy by Design */}
          <div className="safety-card">
            <div className="safety-card-header">
              <div className="safety-icon-wrapper guidance-icon">
                <LockIcon size={24} />
              </div>
              <div>
                <span className="safety-card-kicker">Patient Confidentiality</span>
                <h3 className="safety-card-title">Privacy &amp; Data Security</h3>
              </div>
            </div>
            <p className="safety-card-body">
              Your symptom assessments and personal health parameters are kept confidential. We believe medical self-assessment tools must maintain the highest standards of digital privacy.
            </p>
            <div className="safety-card-tag">
              <span>Confidential &amp; Secure</span>
            </div>
          </div>

          {/* Card 3: Emergency Protocol */}
          <div className="safety-card emergency-safety-card">
            <div className="safety-card-header">
              <div className="safety-icon-wrapper emergency-icon">
                <AlertTriangleIcon size={24} />
              </div>
              <div>
                <span className="safety-card-kicker">Time-Critical Care</span>
                <h3 className="safety-card-title">Emergency Protocol (112)</h3>
              </div>
            </div>
            <p className="safety-card-body">
              Critical symptoms like severe chest pain, sudden paralysis, difficulty breathing, or acute bleeding require immediate paramedic intervention. Call emergency response immediately.
            </p>
            <button
              type="button"
              className="safety-emergency-action"
              onClick={onOpenEmergency}
            >
              <AlertTriangleIcon size={16} />
              <span>View Emergency Guidance</span>
            </button>
          </div>
        </div>

        {/* Clinical Disclaimer Callout Box */}
        <div className="clinical-disclaimer-bar">
          <div className="disclaimer-icon-col">
            <BookOpenIcon size={22} className="disclaimer-alert-icon" />
          </div>
          <div className="disclaimer-text-col">
            <h4 className="disclaimer-heading">Important Health &amp; Safety Disclaimer</h4>
            <p className="disclaimer-paragraph">
              Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. If you think you may have a medical emergency, call your local emergency services (112) or visit an emergency hospital facility immediately.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
