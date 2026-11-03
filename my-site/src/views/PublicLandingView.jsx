import { useState } from 'react';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Features } from '../components/Features';
import { SymptomChecker } from '../components/SymptomChecker';
import { ContainerScroll } from '../components/ContainerScroll';
import { EmergencyGuidanceHub } from '../components/EmergencyGuidanceHub';
import { TrustSafety } from '../components/TrustSafety';
import { EmergencyModal } from '../components/EmergencyModal';
import {
  ShieldAlertIcon,
  SparklesIcon,
  BrainIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
} from '../components/Icons';
import { useNavigation } from '../context/NavigationContext';

export function PublicLandingView({ onOpenEmergency }) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const { navigate } = useNavigation();

  const handleEmergency = onOpenEmergency || (() => setInternalModalOpen(true));

  return (
    <div className="public-landing-page">
      {/* 1. Brand Hero with Living Biological Demonstration */}
      <Hero />

      {/* 2. Three-Stage Patient Care Journey */}
      <div id="how-it-works">
        <HowItWorks onStartCheck={() => {
          const el = document.querySelector('#symptoms');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }} />
      </div>

      {/* 3. Platform Capabilities & Clinical Precision Features */}
      <div id="features">
        <Features />
      </div>

      {/* 4. Interactive Symptom Assessment Studio */}
      <section id="symptoms" className="public-symptoms-section">
        <div className="container">
          <div className="public-section-header">
            <div className="section-badge badge-teal">
              <StethoscopeIcon size={14} />
              <span>Interactive Clinical Triage</span>
            </div>
            <h2 className="public-section-title">
              Symptom Evaluation &amp; Triage Direction
            </h2>
            <p className="public-section-subtitle">
              Input symptoms across bodily systems to receive educational acuity indicators, suggested clinical specialties, and prepared physician consultation talking points.
            </p>
          </div>
        </div>
        <SymptomChecker />
      </section>

      {/* 5. Disease Prediction Technology & Architecture Explanation */}
      <section id="platform" className="public-tech-overview-section">
        <div className="container">
          <div className="public-section-header">
            <div className="section-badge badge-cyan">
              <BrainIcon size={14} />
              <span>Machine Learning Architecture</span>
            </div>
            <h2 className="public-section-title">
              Evidence-Informed Predictive Intelligence
            </h2>
            <p className="public-section-subtitle">
              CarePulse combines validated statistical models and machine learning pipelines to compute early-stage disease risk scores from patient biometric inputs.
            </p>
          </div>

          <div className="public-tech-cards-grid">
            <div className="public-tech-card">
              <div className="tech-card-icon-wrap icon-cyan">
                <BrainIcon size={24} />
              </div>
              <h3 className="tech-card-title">Supervised ML Pipelines</h3>
              <p className="tech-card-desc">
                Multi-factor risk evaluation trained on verified clinical parameters using ensemble Random Forest and Gradient Boosted decision classifiers.
              </p>
              <ul className="tech-card-list">
                <li><ShieldCheckIcon size={14} /> Type-2 Diabetes metabolic trajectories</li>
                <li><ShieldCheckIcon size={14} /> Cardiovascular &amp; arterial stress indices</li>
                <li><ShieldCheckIcon size={14} /> Hypertension &amp; autonomic tone analysis</li>
              </ul>
            </div>

            <div className="public-tech-card">
              <div className="tech-card-icon-wrap icon-teal">
                <SparklesIcon size={24} />
              </div>
              <h3 className="tech-card-title">Feature Weight Attribution</h3>
              <p className="tech-card-desc">
                Explainable AI principles break down exactly which biomarkers contribute to your estimated score, highlighting both protective and adverse drivers.
              </p>
              <ul className="tech-card-list">
                <li><ShieldCheckIcon size={14} /> Real-time continuous input studio</li>
                <li><ShieldCheckIcon size={14} /> Relative feature weight percentages</li>
                <li><ShieldCheckIcon size={14} /> Non-diagnostic clinical safeguards</li>
              </ul>
            </div>

            <div className="public-tech-card">
              <div className="tech-card-icon-wrap icon-blue">
                <ShieldAlertIcon size={24} />
              </div>
              <h3 className="tech-card-title">Personalized Care Action Plans</h3>
              <p className="tech-card-desc">
                Transform statistical predictions into structured lifestyle regimens, nutritional adjustments, and formatted physician consultation briefs.
              </p>
              <ul className="tech-card-list">
                <li><ShieldCheckIcon size={14} /> Actionable preventive checklists</li>
                <li><ShieldCheckIcon size={14} /> Printable doctor consultation briefs</li>
                <li><ShieldCheckIcon size={14} /> Longitudinal trajectory comparisons</li>
              </ul>
            </div>
          </div>

          {/* Interactive Portal Conversion Callout */}
          <div className="public-portal-callout-card">
            <div className="callout-left">
              <span className="callout-badge">Personal Health Workspace</span>
              <h3 className="callout-heading">Establish Your CarePulse Profile</h3>
              <p className="callout-text">
                Create a secure account to log your biometric baseline, run individualized risk predictions, track longitudinal records, and access tailored preventive care.
              </p>
            </div>
            <div className="callout-right">
              <button
                type="button"
                className="btn-callout-primary"
                onClick={() => navigate('/register')}
              >
                <span>Create Free Account</span>
                <ArrowRightIcon size={16} />
              </button>
              <button
                type="button"
                className="btn-callout-secondary"
                onClick={() => navigate('/login')}
              >
                <span>Sign In to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Emergency Guidance Hub in 3D ContainerScroll */}
      <section id="emergency-guidance" className="emergency-guidance-scroll-section">
        <ContainerScroll
          titleComponent={
            <div className="scroll-title-container">
              <div className="section-badge badge-emergency">
                <ShieldAlertIcon size={16} />
                <span>Immediate Medical Protocol</span>
              </div>
              <h2 className="scroll-headline">
                Emergency Triage &amp; Rapid Response
              </h2>
              <p className="scroll-subheadline">
                Critical medical symptoms demand immediate action. Know the red-flags and connect directly to emergency services.
              </p>
            </div>
          }
        >
          <EmergencyGuidanceHub
            onOpenModal={handleEmergency}
          />
        </ContainerScroll>
      </section>

      {/* 7. Trust, Ethics & Safety Standards */}
      <div id="safety">
        <TrustSafety onOpenEmergency={handleEmergency} />
      </div>

      {/* Fallback Emergency Guidance Modal Dialog if not rendered by Layout */}
      {!onOpenEmergency && (
        <EmergencyModal
          isOpen={internalModalOpen}
          onClose={() => setInternalModalOpen(false)}
        />
      )}
    </div>
  );
}
