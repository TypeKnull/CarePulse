import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  StethoscopeIcon,
  CheckIcon,
  FileTextIcon,
  ArrowRightIcon,
} from '../Icons';

export function UpcomingCare({ upcomingCare = {}, onPrepareDoctorVisit }) {
  const { appointment, suggestedFollowUps = [] } = upcomingCare || {};
  const [checkedPrepItems, setCheckedPrepItems] = useState({});
  const [showBrief, setShowBrief] = useState(false);

  const togglePrep = (idx) => {
    setCheckedPrepItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const appointmentDate = appointment?.date ? new Date(appointment.date) : null;
  const hasAppointmentDate = appointmentDate && Number.isFinite(appointmentDate.getTime());
  const formattedDate = hasAppointmentDate
    ? appointmentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date not recorded';
  const formattedTime = hasAppointmentDate && /[T ]\d{2}:\d{2}/.test(appointment.date)
    ? appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time not recorded';
  const daysRemaining = hasAppointmentDate
    ? Math.max(0, Math.ceil((appointmentDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000))
    : null;

  return (
    <section className="upcoming-care-section" aria-labelledby="upcoming-care-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-teal">
            <CalendarIcon size={14} />
            <span>Care Coordination</span>
          </div>
          <h2 id="upcoming-care-title" className="section-heading-sm">
            Upcoming Clinical Milestones &amp; Appointments
          </h2>
        </div>
      </div>

      <div className="upcoming-care-grid">
        {/* Main Appointment Card */}
        {appointment ? <div className="appointment-card">
          <div className="appointment-card-header">
            <div className="physician-avatar-badge">
              <StethoscopeIcon size={24} className="avatar-icon" />
            </div>
            <div className="physician-details">
              <span className="physician-name">{appointment.doctorName || appointment.doctor || 'Clinician not recorded'}</span>
              <span className="physician-specialty">{appointment.specialty || 'Specialty not recorded'}</span>
              <span className="clinic-location">{appointment.clinic || appointment.location || 'Location not recorded'}</span>
            </div>
            <div className="countdown-pill">
              <span className="countdown-number">{daysRemaining ?? '—'}</span>
              <span className="countdown-text">days away</span>
            </div>
          </div>

          {/* Time & Mode Meta */}
          <div className="appointment-meta-strip">
            <div className="meta-slot">
              <CalendarIcon size={15} />
              <span>{formattedDate}</span>
            </div>
            <div className="meta-slot">
              <ClockIcon size={15} />
              <span>{formattedTime}</span>
            </div>
            <div className="meta-slot mode-slot">
              <span className="mode-tag">{appointment.mode || appointment.type || 'Visit type not recorded'}</span>
            </div>
          </div>

          <div className="appointment-purpose-box">
            <span className="purpose-label">Visit Focus:</span>
            <span className="purpose-text">{appointment.purpose || 'Visit details not recorded'}</span>
          </div>

          {/* Consultation Preparation Checklist */}
          {appointment.prepList && appointment.prepList.length > 0 && (
            <div className="consultation-prep-box">
              <span className="prep-heading">Pre-Consultation Checklist:</span>
              <div className="prep-list">
                {appointment.prepList.map((item, idx) => {
                  const isChecked = !!checkedPrepItems[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`prep-item-row ${isChecked ? 'prep-done' : ''}`}
                      onClick={() => togglePrep(idx)}
                      aria-label={isChecked ? `Mark unready: ${item}` : `Mark ready: ${item}`}
                    >
                      <span className="prep-checkbox-visual">
                        {isChecked ? <CheckIcon size={12} /> : null}
                      </span>
                      <span className="prep-text">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="appointment-footer-actions">
            <button
              type="button"
              className="btn-prepare-brief"
              onClick={() => { setShowBrief((shown) => !shown); onPrepareDoctorVisit?.(); }}
            >
              <FileTextIcon size={16} />
              <span>{showBrief ? 'Hide Visit Details' : 'Prepare Consultation Brief'}</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>
          {showBrief && (
            <div className="consultation-prep-box" role="status">
              <span className="prep-heading">Recorded appointment details</span>
              <p>{appointment.doctorName || appointment.doctor || 'Clinician not recorded'}{appointment.specialty ? ` • ${appointment.specialty}` : ''}</p>
              <p>{formattedDate}{formattedTime !== 'Time not recorded' ? ` at ${formattedTime}` : ''}</p>
              <p>{appointment.type || appointment.mode || 'Visit type not recorded'}{appointment.location ? ` • ${appointment.location}` : ''}</p>
              <p>Bring current medication and relevant lab information for your clinician to review.</p>
            </div>
          )}
        </div> : (
          <div className="appointment-card">
            <p>No upcoming appointment scheduled.</p>
          </div>
        )}

        {/* Suggested Clinical Milestones Card */}
        <div className="suggested-followups-card">
          <div className="followup-header">
            <span className="followup-card-title">Preventive Milestones</span>
            <span className="followup-card-subtitle">Clinician-prescribed follow-ups</span>
          </div>

          <div className="followup-items-list">
            {suggestedFollowUps.length === 0 && (
              <p className="empty-state-message">No clinician-prescribed follow-ups are recorded.</p>
            )}
            {suggestedFollowUps.map((item, idx) => (
              <div key={idx} className="followup-item-box">
                <div className="followup-item-top">
                  <span className="followup-title">{item.title}</span>
                  <span className={`followup-status-tag tag-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
                <div className="followup-due-row">
                  <CalendarIcon size={13} />
                  <span>Target Window: {item.dueBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
