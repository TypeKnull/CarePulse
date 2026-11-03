import { useState } from 'react';

const blankFields = {
  lab: {
    testName: '', resultValue: '', unit: '', referenceRange: '',
    reportDate: new Date().toISOString().slice(0, 10), labName: '', isAbnormal: false,
  },
  vitals: { systolicBp: '', diastolicBp: '', heartRate: '', temperature: '', respiratoryRate: '' },
  lifestyle: { physicalActivityDays: '', smokingStatus: '' },
};

const formTitles = { lab: 'Record a lab result', vitals: 'Record vital measurements', lifestyle: 'Log lifestyle information' };

export function DashboardRecordForm({ type, onCancel, onSave }) {
  const [values, setValues] = useState(blankFields[type]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const change = (field, value) => setValues((previous) => ({ ...previous, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => {
      if (['resultValue', 'systolicBp', 'diastolicBp', 'heartRate', 'temperature', 'respiratoryRate', 'physicalActivityDays'].includes(key)) {
        return [key, value === '' ? undefined : Number(value)];
      }
      if (key === 'smokingStatus') return [key, value === '' ? undefined : value === 'yes'];
      return [key, value];
    }));
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || 'The record could not be saved. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="dashboard-record-panel" onSubmit={submit} aria-labelledby="dashboard-record-title">
      <div className="dashboard-record-header">
        <h2 id="dashboard-record-title">{formTitles[type]}</h2>
        <button type="button" className="dashboard-record-cancel" onClick={onCancel}>Close</button>
      </div>

      {type === 'lab' && <div className="dashboard-record-grid">
        <label>Test name<input className="auth-input-control" required maxLength="100" value={values.testName} onChange={(event) => change('testName', event.target.value)} placeholder="Fasting blood glucose" /></label>
        <label>Result<input className="auth-input-control" type="number" min="0.01" max="100000" step="any" required value={values.resultValue} onChange={(event) => change('resultValue', event.target.value)} /></label>
        <label>Unit<input className="auth-input-control" required maxLength="30" value={values.unit} onChange={(event) => change('unit', event.target.value)} placeholder="mg/dL" /></label>
        <label>Reference range (from report)<input className="auth-input-control" maxLength="50" value={values.referenceRange} onChange={(event) => change('referenceRange', event.target.value)} placeholder="As shown on report" /></label>
        <label>Collection date<input className="auth-input-control" type="date" required max={new Date().toISOString().slice(0, 10)} value={values.reportDate} onChange={(event) => change('reportDate', event.target.value)} /></label>
        <label>Laboratory (optional)<input className="auth-input-control" maxLength="150" value={values.labName} onChange={(event) => change('labName', event.target.value)} /></label>
        <label className="dashboard-record-checkbox"><input type="checkbox" checked={values.isAbnormal} onChange={(event) => change('isAbnormal', event.target.checked)} /> Report marks this result abnormal</label>
      </div>}

      {type === 'vitals' && <div className="dashboard-record-grid">
        <label>Systolic BP (mmHg)<input className="auth-input-control" type="number" min="50" max="300" value={values.systolicBp} onChange={(event) => change('systolicBp', event.target.value)} /></label>
        <label>Diastolic BP (mmHg)<input className="auth-input-control" type="number" min="20" max="200" value={values.diastolicBp} onChange={(event) => change('diastolicBp', event.target.value)} /></label>
        <label>Heart rate (bpm)<input className="auth-input-control" type="number" min="25" max="250" value={values.heartRate} onChange={(event) => change('heartRate', event.target.value)} /></label>
        <label>Temperature (°C)<input className="auth-input-control" type="number" min="30" max="45" step="0.1" value={values.temperature} onChange={(event) => change('temperature', event.target.value)} /></label>
        <label>Respiratory rate (/min)<input className="auth-input-control" type="number" min="4" max="60" value={values.respiratoryRate} onChange={(event) => change('respiratoryRate', event.target.value)} /></label>
        <p className="dashboard-record-hint">Enter at least one measurement. Blood pressure requires both values. These are records, not diagnoses.</p>
      </div>}

      {type === 'lifestyle' && <div className="dashboard-record-grid">
        <label>Physical activity (days per week)<input className="auth-input-control" type="number" min="0" max="7" step="0.5" value={values.physicalActivityDays} onChange={(event) => change('physicalActivityDays', event.target.value)} /></label>
        <label>Smoking status<select className="auth-input-control auth-select-control" value={values.smokingStatus} onChange={(event) => change('smokingStatus', event.target.value)}><option value="">Not recorded in this entry</option><option value="no">Non-smoker</option><option value="yes">Current smoker</option></select></label>
        <p className="dashboard-record-hint">Entries are patient-reported and saved with their recording time.</p>
      </div>}

      {error && <p className="dashboard-record-error" role="alert">{error}</p>}
      <div className="dashboard-record-actions">
        <button type="button" className="btn-onboarding-back" onClick={onCancel} disabled={isSaving}>Cancel</button>
        <button type="submit" className="btn-onboarding-next" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save record'}</button>
      </div>
    </form>
  );
}
