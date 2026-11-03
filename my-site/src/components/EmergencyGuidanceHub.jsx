import { useState } from 'react';
import {
  ShieldAlertIcon,
  PhoneCallIcon,
  HeartPulseIcon,
  LungsIcon,
  BrainIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
} from './Icons';

export function EmergencyGuidanceHub({ onOpenModal }) {
  const [emergencyNumber] = useState('112');

  const emergencyCategories = [
    {
      id: 'cardiovascular',
      title: 'Cardiovascular Red-Flags',
      subtitle: 'Immediate Cardiac Risk',
      icon: <HeartPulseIcon size={22} />,
      urgency: 'Immediate Dispatch',
      signs: [
        'Crushing or severe pressure in central chest',
        'Pain radiating to left arm, neck, jaw, or back',
        'Sudden collapse, severe dizziness, or loss of consciousness',
        'Cold sweat accompanied by unexplained nausea',
      ],
    },
    {
      id: 'respiratory',
      title: 'Respiratory Distress',
      subtitle: 'Acute Airway Compromise',
      icon: <LungsIcon size={22} />,
      urgency: 'Immediate Dispatch',
      signs: [
        'Inability to speak in full sentences due to breathlessness',
        'Severe, sudden onset stridor, gasping, or acute choking',
        'Bluish discoloration around lips, tongue, or fingertips',
        'Rapidly deteriorating breathing despite resting',
      ],
    },
    {
      id: 'neurological',
      title: 'Neurological (F.A.S.T.)',
      subtitle: 'Acute Stroke & Neural Signs',
      icon: <BrainIcon size={22} />,
      urgency: 'Time-Critical Window',
      signs: [
        'Face: Sudden drooping or numbness on one side',
        'Arms: Sudden weakness or inability to raise an arm',
        'Speech: Slurred words, confusion, or unable to understand',
        'Sudden, explosive headache ("thunderclap") with no prior history',
      ],
    },
    {
      id: 'trauma',
      title: 'Severe Trauma & Anaphylaxis',
      subtitle: 'Systemic Crisis',
      icon: <AlertTriangleIcon size={22} />,
      urgency: 'Immediate Dispatch',
      signs: [
        'Uncontrolled arterial or severe persistent bleeding',
        'Rapid swelling of tongue, lips, or throat with airway tightness',
        'Severe burns covering large body surface areas',
        'Acute traumatic head or spinal injury with disorientation',
      ],
    },
  ];

  return (
    <div className="emergency-hub-interior">
      {/* Top Urgent Command Bar */}
      <div className="emergency-hub-top-bar">
        <div className="emergency-brand-indicator">
          <div className="emergency-pulse-beacon">
            <span className="beacon-ring" />
            <span className="beacon-dot" />
          </div>
          <div>
            <span className="emergency-kicker">Immediate Medical Attention Protocol</span>
            <h3 className="emergency-main-heading">Critical Triage &amp; Rapid Action Cockpit</h3>
          </div>
        </div>

        <div className="emergency-primary-actions">
          <a
            href={`tel:${emergencyNumber}`}
            className="emergency-direct-call-btn"
            aria-label={`Call Emergency Services at ${emergencyNumber}`}
          >
            <PhoneCallIcon size={20} />
            <span>Call Emergency Services — {emergencyNumber}</span>
          </a>
          <button
            type="button"
            className="emergency-modal-trigger-btn"
            onClick={onOpenModal}
          >
            <span>Detailed Protocol</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>

      {/* 4 Quadrant Critical Warning Matrix */}
      <div className="emergency-quadrant-grid">
        {emergencyCategories.map((cat) => (
          <div key={cat.id} className="emergency-quadrant-card">
            <div className="quadrant-header">
              <div className="quadrant-icon-box">
                {cat.icon}
              </div>
              <div>
                <span className="quadrant-urgency-tag">{cat.urgency}</span>
                <h4 className="quadrant-title">{cat.title}</h4>
                <span className="quadrant-subtitle">{cat.subtitle}</span>
              </div>
            </div>

            <ul className="quadrant-signs-list">
              {cat.signs.map((sign, idx) => (
                <li key={idx} className="quadrant-sign-item">
                  <span className="quadrant-bullet-dot" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Lower Tactical Directive Row */}
      <div className="emergency-tactical-footer">
        <div className="tactical-item">
          <ShieldAlertIcon size={18} className="tactical-icon" />
          <span><strong>Do not wait for online tools:</strong> Acute symptoms require immediate paramedic response.</span>
        </div>
        <div className="tactical-item">
          <CheckCircle2Icon size={18} className="tactical-icon-success" />
          <span>Keep patient still, calm, and ensure clear airway while emergency services are en route.</span>
        </div>
      </div>
    </div>
  );
}
