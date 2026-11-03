import { useEffect } from 'react';
import {
  PhoneCallIcon,
  XIcon,
  HeartPulseIcon,
  LungsIcon,
  BrainIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
} from './Icons';

export function EmergencyModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="emergency-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
    >
      <div
        className="emergency-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="emergency-modal-header">
          <div className="emergency-icon-badge">
            <ShieldAlertIcon size={24} />
          </div>
          <div className="emergency-header-text">
            <span className="emergency-modal-kicker">Immediate Medical Attention</span>
            <h2 id="emergency-modal-title" className="emergency-modal-title">
              Emergency Guidance Protocol
            </h2>
          </div>
          <button
            type="button"
            className="emergency-modal-close"
            onClick={onClose}
            aria-label="Close emergency guidance dialog"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="emergency-modal-body">
          {/* Urgent Warning Callout */}
          <div className="emergency-alert-callout">
            <AlertTriangleIcon size={20} className="emergency-callout-icon" />
            <div className="emergency-callout-content">
              <strong>If you or someone around you is experiencing an acute emergency:</strong>
              <p>
                Stop using this website immediately and call regional emergency services (<strong>112</strong>) or proceed to the nearest hospital emergency department.
              </p>
            </div>
          </div>

          {/* Red Flag Symptoms Grid */}
          <div className="emergency-symptoms-section">
            <h3 className="emergency-symptom-title">Red-Flag Symptoms Requiring Immediate Emergency Care:</h3>
            <div className="emergency-symptoms-grid">
              <div className="emergency-symptom-card">
                <div className="symptom-card-header">
                  <HeartPulseIcon size={18} className="symptom-card-icon card-icon-cardiac" />
                  <strong>Cardiovascular</strong>
                </div>
                <p>Crushing chest pressure, pain radiating to left arm/jaw, sudden unexplained fainting or cold sweat.</p>
              </div>

              <div className="emergency-symptom-card">
                <div className="symptom-card-header">
                  <LungsIcon size={18} className="symptom-card-icon card-icon-lung" />
                  <strong>Respiratory Crisis</strong>
                </div>
                <p>Severe shortness of breath, inability to speak full sentences, acute choking or bluish lips.</p>
              </div>

              <div className="emergency-symptom-card">
                <div className="symptom-card-header">
                  <BrainIcon size={18} className="symptom-card-icon card-icon-neuro" />
                  <strong>Neurological (F.A.S.T.)</strong>
                </div>
                <p>Sudden facial drooping, one-sided arm weakness, slurred speech, confusion, or explosive sudden headache.</p>
              </div>

              <div className="emergency-symptom-card">
                <div className="symptom-card-header">
                  <AlertTriangleIcon size={18} className="symptom-card-icon card-icon-trauma" />
                  <strong>Trauma &amp; Allergic</strong>
                </div>
                <p>Uncontrolled severe bleeding, sudden swelling of lips/throat with breathing difficulty, acute trauma.</p>
              </div>
            </div>
          </div>

          {/* Action Dispatch Box with Direct Call */}
          <div className="emergency-action-box">
            <div className="emergency-action-info">
              <span className="emergency-action-label">Direct Emergency Helpline</span>
              <p className="emergency-action-text">Call National Emergency Response (India &amp; Universal Dispatch)</p>
            </div>
            <a
              href="tel:112"
              className="emergency-dispatch-btn"
              aria-label="Call Emergency Services at 112"
            >
              <PhoneCallIcon size={18} />
              <span>Call 112 Immediately</span>
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="emergency-modal-footer">
          <p className="emergency-disclaimer-text">
            <strong>Safety Notice:</strong> CarePulse is an educational health guidance platform and does not provide paramedic dispatch or clinical emergency care.
          </p>
          <button
            type="button"
            className="emergency-dismiss-btn"
            onClick={onClose}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
