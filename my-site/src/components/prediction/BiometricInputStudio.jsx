import {
  RotateCcwIcon,
  SparklesIcon,
  ActivityIcon,
  HeartPulseIcon,
  DropletIcon,
  ScaleIcon,
  InfoIcon,
} from '../Icons';

function FieldSource({ field, exampleFields }) {
  const isExample = exampleFields.includes(field);
  return (
    <span className={`input-source-tag ${isExample ? 'source-example' : 'source-saved'}`}>
      {isExample ? 'Example or missing input' : 'Saved baseline'}
    </span>
  );
}

export function BiometricInputStudio({
  selectedModelId = 'diabetes',
  values = {},
  exampleFields = [],
  onChange,
  onResetToProfile,
  onSubmit,
  isProcessing = false,
  validationError = '',
}) {
  const handleChange = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className="input-studio-container" aria-labelledby="input-studio-heading">
      {/* Studio Header Bar */}
      <div className="input-studio-header">
        <div className="studio-title-wrap">
          <div className="section-badge badge-teal">
            <ActivityIcon size={14} />
            <span>Biometric Input Studio</span>
          </div>
          <h3 id="input-studio-heading" className="studio-heading">
            Biometric Parameters &amp; Clinical Features
          </h3>
          <p className="studio-subtext">
            Review the source shown beside each value. Example values are for demonstration; replace them with patient measurements before use.
          </p>
        </div>

        <button
          type="button"
          className="btn-load-profile"
          onClick={onResetToProfile}
          disabled={isProcessing}
          aria-label="Load patient profile baseline vitals"
        >
          <RotateCcwIcon size={14} />
          <span>Reset to available baseline</span>
        </button>
      </div>

      {/* Input Form Grid */}
      <form
        className="biometric-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isProcessing) onSubmit();
        }}
      >
        <div className="input-cards-grid">
          {/* Demographics */}
          <div className="input-card">
            <div className="input-card-header">
              <span className="input-label">Demographics</span>
              <span className="input-tag-badge">Demographics</span>
            </div>
            <div className="dual-input-row">
              <div className="numeric-slider-wrap flex-1">
                <div className="slider-label-row">
                  <span className="sub-label">Age: <strong>{values.age ?? 'Not recorded'}</strong> yrs <FieldSource field="age" exampleFields={exampleFields} /></span>
                  <span className="sub-range">18 – 90</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="90"
                  value={values.age ?? 18}
                  onChange={(e) => handleChange('age', Number(e.target.value))}
                  disabled={isProcessing}
                  className="clinical-range-slider"
                  aria-label="Patient Age"
                />
              </div>
              {selectedModelId === 'cardiovascular' && (
                <div className="sex-input-group">
                  <span className="sub-label">Sex <FieldSource field="gender" exampleFields={exampleFields} /></span>
                  <div className="segmented-sex-control">
                    {['male', 'female'].map((sex) => (
                      <button
                        key={sex}
                        type="button"
                        className={`sex-toggle-btn ${values.gender === sex ? 'active' : ''}`}
                        onClick={() => handleChange('gender', sex)}
                        disabled={isProcessing}
                        aria-pressed={values.gender === sex}
                      >
                        {sex === 'male' ? 'Male' : 'Female'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Body Mass Index (BMI) */}
          <div className="input-card">
            <div className="input-card-header">
              <span className="input-label">
                <ScaleIcon size={16} className="input-icon-svg" /> Body Mass Index (BMI)
              </span>
              <span className={`input-status-pill ${values.bmi == null ? '' : values.bmi >= 30 ? 'pill-high' : values.bmi >= 25 ? 'pill-mod' : 'pill-opt'}`}>
                {values.bmi == null ? 'Not recorded' : values.bmi >= 30 ? 'Obese' : values.bmi >= 25 ? 'Overweight' : 'Normal'}
              </span>
            </div>
            <div className="numeric-slider-wrap">
              <div className="slider-label-row">
                  <span className="sub-val-highlight">{values.bmi ?? 'Not recorded'} <span className="unit">kg/m²</span> <FieldSource field="bmi" exampleFields={exampleFields} /></span>
                <span className="sub-range">Optimal: 18.5 – 24.9</span>
              </div>
              <input
                type="range"
                min="16.0"
                max="42.0"
                step="0.1"
                value={values.bmi ?? 16}
                onChange={(e) => handleChange('bmi', parseFloat(e.target.value))}
                disabled={isProcessing}
                className="clinical-range-slider"
                aria-label="Body Mass Index"
              />
            </div>
          </div>

          {/* Diabetes glucose */}
          {selectedModelId === 'diabetes' && <div className="input-card highlight-card">
            <div className="input-card-header">
              <span className="input-label">
                <DropletIcon size={16} className="input-icon-svg icon-glucose" /> Fasting Blood Glucose
              </span>
              <span className={`input-status-pill ${values.fastingGlucose == null ? '' : values.fastingGlucose > 125 ? 'pill-high' : values.fastingGlucose >= 100 ? 'pill-mod' : 'pill-opt'}`}>
                {values.fastingGlucose == null ? 'Not recorded' : values.fastingGlucose > 125 ? 'Elevated' : values.fastingGlucose >= 100 ? 'Borderline' : 'Normal'}
              </span>
            </div>
            <div className="numeric-slider-wrap">
              <div className="slider-label-row">
                <span className="sub-val-highlight">{values.fastingGlucose} <span className="unit">mg/dL</span> <FieldSource field="fastingGlucose" exampleFields={exampleFields} /></span>
                <span className="sub-range">Standard: 70 – 99 mg/dL</span>
              </div>
              <input
                type="range"
                min="65"
                max="240"
                step="1"
                value={values.fastingGlucose ?? 65}
                onChange={(e) => handleChange('fastingGlucose', Number(e.target.value))}
                disabled={isProcessing}
                className="clinical-range-slider slider-glucose"
                aria-label="Fasting Blood Glucose"
              />
            </div>
          </div>}

          {/* 4. Blood Pressure (Systolic / Diastolic) */}
          <div className={`input-card ${(selectedModelId === 'hypertension' || selectedModelId === 'cardiovascular') ? 'highlight-card' : ''}`}>
            <div className="input-card-header">
              <span className="input-label">
                <HeartPulseIcon size={16} className="input-icon-svg icon-bp" /> Resting Blood Pressure
              </span>
              <span className={`input-status-pill ${values.systolicBp == null ? '' : values.systolicBp >= 140 ? 'pill-high' : values.systolicBp >= 120 ? 'pill-mod' : 'pill-opt'}`}>
                {values.systolicBp == null ? 'Not recorded' : values.systolicBp >= 140 ? 'Stage 2 HTN' : values.systolicBp >= 120 ? 'Pre-HTN' : 'Normal'}
              </span>
            </div>
            <div className="dual-slider-grid">
              <div className="numeric-slider-wrap">
                <div className="slider-label-row">
                  <span className="sub-label">Systolic: <strong>{values.systolicBp ?? 'Not recorded'}</strong> mmHg <FieldSource field="systolicBp" exampleFields={exampleFields} /></span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="190"
                  value={values.systolicBp ?? 90}
                  onChange={(e) => handleChange('systolicBp', Number(e.target.value))}
                  disabled={isProcessing}
                  className="clinical-range-slider"
                  aria-label="Systolic Blood Pressure"
                />
              </div>
              {selectedModelId !== 'diabetes' && <div className="numeric-slider-wrap">
                <div className="slider-label-row">
                  <span className="sub-label">Diastolic: <strong>{values.diastolicBp ?? 'Not recorded'}</strong> mmHg <FieldSource field="diastolicBp" exampleFields={exampleFields} /></span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="120"
                  value={values.diastolicBp ?? 55}
                  onChange={(e) => handleChange('diastolicBp', Number(e.target.value))}
                  disabled={isProcessing}
                  className="clinical-range-slider"
                  aria-label="Diastolic Blood Pressure"
                />
              </div>}
            </div>
          </div>

          {/* Cardiovascular lipid panel */}
          {selectedModelId === 'cardiovascular' && <div className="input-card highlight-card">
            <div className="input-card-header">
              <span className="input-label">
                <ActivityIcon size={16} className="input-icon-svg icon-cholesterol" /> Serum Cholesterol
              </span>
              <span className={`input-status-pill ${values.totalCholesterol == null ? '' : values.totalCholesterol > 200 ? 'pill-mod' : 'pill-opt'}`}>
                {values.totalCholesterol == null ? 'Not recorded' : values.totalCholesterol > 200 ? 'Borderline' : 'Desirable'}
              </span>
            </div>
            <div className="numeric-slider-wrap">
              <div className="slider-label-row">
                <span className="sub-val-highlight">{values.totalCholesterol ?? 'Not recorded'} <span className="unit">mg/dL</span> <FieldSource field="totalCholesterol" exampleFields={exampleFields} /></span>
                <span className="sub-range">Desirable: &lt;200 mg/dL</span>
              </div>
              <input
                type="range"
                min="120"
                max="320"
                value={values.totalCholesterol ?? 120}
                onChange={(e) => handleChange('totalCholesterol', Number(e.target.value))}
                disabled={isProcessing}
                className="clinical-range-slider"
                aria-label="Total Serum Cholesterol"
              />
            </div>
          </div>}

          {/* 6. Physical Activity & Lifestyle */}
          <div className="input-card">
            <div className="input-card-header">
              <span className="input-label">Physical Activity &amp; Lifestyle</span>
              <span className="input-tag-badge">Behavioral</span>
            </div>
            <div className="dual-input-row">
              <div className="numeric-slider-wrap flex-1">
                <div className="slider-label-row">
                  <span className="sub-label">Activity: <strong>{values.physicalActivityDays ?? 'Not recorded'}</strong> days/wk <FieldSource field="physicalActivityDays" exampleFields={exampleFields} /></span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="0.5"
                  value={values.physicalActivityDays ?? 0}
                  onChange={(e) => handleChange('physicalActivityDays', parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="clinical-range-slider"
                  aria-label="Physical Activity Days per week"
                />
              </div>

              {/* Smoking Toggle */}
              {selectedModelId !== 'diabetes' && <div className="toggle-control-box">
                <span className="toggle-label">Tobacco Exposure:</span>
                <FieldSource field="smokingStatus" exampleFields={exampleFields} />
                <button
                  type="button"
                  className={`toggle-pill-btn ${values.smokingStatus ? 'toggle-active' : ''}`}
                  onClick={() => handleChange('smokingStatus', !values.smokingStatus)}
                  disabled={isProcessing}
                  aria-pressed={values.smokingStatus}
                >
                  <span className="toggle-dot" />
                  <span>{values.smokingStatus == null ? 'Not provided' : values.smokingStatus ? 'Smoker' : 'Non-Smoker'}</span>
                </button>
              </div>}
            </div>
          </div>

          {/* 7. Model-Specific Clinical Parameter Extras */}
          {(selectedModelId === 'diabetes' || selectedModelId === 'hypertension') && (
            <div className="input-card card-full-span">
              <div className="input-card-header">
                <span className="input-label">Family history</span>
                  <span className="input-tag-badge">Required input</span>
              </div>
              <div className="toggle-inline-row">
                <span className="inline-desc">
                  Does a first-degree biological relative (parent or sibling) have a diagnosis of {selectedModelId === 'diabetes' ? 'Type-2 diabetes' : 'hypertension'}? <FieldSource field="familyHistory" exampleFields={exampleFields} />
                </span>
                <button
                  type="button"
                  className={`toggle-pill-btn ${values.familyHistory ? 'toggle-active' : ''}`}
                  onClick={() => handleChange('familyHistory', !values.familyHistory)}
                  disabled={isProcessing}
                  aria-pressed={values.familyHistory}
                >
                  <span className="toggle-dot" />
                  <span>{values.familyHistory == null ? 'Not provided' : values.familyHistory ? 'Family History Present' : 'No Known Family History'}</span>
                </button>
              </div>
            </div>
          )}

          {selectedModelId === 'cardiovascular' && (
            <div className="input-card card-full-span">
              <div className="input-card-header">
                <span className="input-label">Lipid Fractionation (HDL / LDL)</span>
                <span className="input-tag-badge">Advanced Biomarkers</span>
              </div>
              <div className="dual-slider-grid">
                <div className="numeric-slider-wrap">
                  <div className="slider-label-row">
                    <span className="sub-label">HDL Cholesterol: <strong>{values.hdl ?? 'Not recorded'}</strong> mg/dL <FieldSource field="hdl" exampleFields={exampleFields} /></span>
                    <span className="sub-range">Optimal: &ge; 40–50</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={values.hdl ?? 20}
                    onChange={(e) => handleChange('hdl', Number(e.target.value))}
                    disabled={isProcessing}
                    className="clinical-range-slider"
                    aria-label="HDL Cholesterol"
                  />
                </div>
                <div className="numeric-slider-wrap">
                  <div className="slider-label-row">
                    <span className="sub-label">LDL Cholesterol: <strong>{values.ldl ?? 'Not recorded'}</strong> mg/dL <FieldSource field="ldl" exampleFields={exampleFields} /></span>
                    <span className="sub-range">Optimal: &lt; 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="220"
                    value={values.ldl ?? 50}
                    onChange={(e) => handleChange('ldl', Number(e.target.value))}
                    disabled={isProcessing}
                    className="clinical-range-slider"
                    aria-label="LDL Cholesterol"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {validationError && <p className="prediction-validation-error" role="alert">{validationError}</p>}

        {/* Action & Disclaimer Strip */}
        <div className="studio-action-strip">
          <div className="studio-disclaimer-text">
            <InfoIcon size={14} />
            <span>Parameters are formatted for scikit-learn model inference. Model output represents statistical risk estimates, not definitive medical diagnoses.</span>
          </div>

          <button
            type="submit"
            className={`btn-run-prediction ${isProcessing ? 'btn-evaluating' : ''}`}
            disabled={isProcessing}
          >
            <SparklesIcon size={18} />
            <span>{isProcessing ? 'Evaluating Model Features...' : 'Run Predictive Assessment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
