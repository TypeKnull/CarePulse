-- =====================================================================
-- CarePulse Healthcare Management & Disease Risk Prediction System
-- Relational Database DDL Schema (MySQL 8.0+)
-- Source: ER Diagram (Chen Notation, 15 Entities)
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

CREATE DATABASE IF NOT EXISTS carepulse
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE carepulse;

-- ---------------------------------------------------------------------
-- 1. USER
-- System user accounts for authentication and role-based access
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user (
    user_id VARCHAR(64) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'patient',
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_user PRIMARY KEY (user_id),
    CONSTRAINT uq_user_email UNIQUE (email),
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. USER_SESSION
-- Active and historical user authentication sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_session (
    session_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    token VARCHAR(512) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_session PRIMARY KEY (session_id),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) 
        REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_session_user (user_id),
    INDEX idx_session_token (token(255)),
    INDEX idx_session_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. PATIENT
-- Clinical patient records linked to user accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient (
    patient_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(20) NULL,
    blood_group VARCHAR(10) NULL,
    height_cm DECIMAL(5, 2) NULL,
    weight_kg DECIMAL(5, 2) NULL,
    smoking_status VARCHAR(30) NULL,
    physical_activity_level VARCHAR(50) NULL,
    emergency_contact_name VARCHAR(150) NULL,
    emergency_contact_phone VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_patient PRIMARY KEY (patient_id),
    CONSTRAINT fk_patient_user FOREIGN KEY (user_id) 
        REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_patient_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. HEALTH_PROFILE (1:1 with PATIENT)
-- Medical history, allergies, chronic conditions, and medications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_profile (
    profile_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    allergies TEXT NULL,
    chronic_conditions TEXT NULL,
    current_medications TEXT NULL,
    family_history TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_health_profile PRIMARY KEY (profile_id),
    CONSTRAINT uq_health_profile_patient UNIQUE (patient_id),
    CONSTRAINT fk_health_profile_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. VITALS (1:N with PATIENT)
-- Recorded physiological vital signs over time
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vitals (
    vital_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    systolic_bp INT NULL,
    diastolic_bp INT NULL,
    heart_rate INT NULL,
    temperature DECIMAL(4, 1) NULL,
    respiratory_rate INT NULL,
    CONSTRAINT pk_vitals PRIMARY KEY (vital_id),
    CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_vitals_patient_date (patient_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. LAB_REPORT (1:N with PATIENT)
-- Laboratory test panels and medical diagnostic documents
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_report (
    lab_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    report_date DATE NOT NULL,
    lab_name VARCHAR(150) NULL,
    report_type VARCHAR(100) NULL,
    file_url VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_lab_report PRIMARY KEY (lab_id),
    CONSTRAINT fk_lab_report_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_lab_report_patient (patient_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. LAB_RESULT (N:1 with LAB_REPORT, 1:N with PATIENT)
-- Granular numerical test measurements from lab panels
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_result (
    lab_result_id VARCHAR(64) NOT NULL,
    lab_id VARCHAR(64) NULL,
    patient_id VARCHAR(64) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    result_value VARCHAR(50) NOT NULL,
    unit VARCHAR(30) NULL,
    reference_range VARCHAR(50) NULL,
    is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_lab_result PRIMARY KEY (lab_result_id),
    CONSTRAINT fk_lab_result_report FOREIGN KEY (lab_id) 
        REFERENCES lab_report(lab_id) ON DELETE SET NULL,
    CONSTRAINT fk_lab_result_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_lab_result_patient (patient_id),
    INDEX idx_lab_result_test (test_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. SYMPTOM_CHECK (1:N with PATIENT)
-- Clinical symptom triage checks and recommendations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS symptom_check (
    check_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NULL,
    check_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    symptom_summary TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    recommendation TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_symptom_check PRIMARY KEY (check_id),
    CONSTRAINT fk_symptom_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_symptom_patient (patient_id, check_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. DISEASE_MODEL
-- Catalog of predictive machine learning models and algorithms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disease_model (
    model_id VARCHAR(64) NOT NULL,
    disease_name VARCHAR(100) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_disease_model PRIMARY KEY (model_id),
    CONSTRAINT uq_disease_name UNIQUE (disease_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. PREDICTION
-- Disease risk assessments computed for patients
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction (
    prediction_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    model_id VARCHAR(64) NOT NULL,
    assessment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    risk_score DECIMAL(5, 2) NOT NULL,
    risk_category VARCHAR(50) NOT NULL,
    result_summary TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prediction PRIMARY KEY (prediction_id),
    CONSTRAINT fk_prediction_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_model FOREIGN KEY (model_id) 
        REFERENCES disease_model(model_id),
    INDEX idx_prediction_patient (patient_id, assessment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. PREDICTION_FACTOR (1:N with PREDICTION)
-- Individual clinical attribution weights and risk drivers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_factor (
    factor_id VARCHAR(64) NOT NULL,
    prediction_id VARCHAR(64) NOT NULL,
    factor_name VARCHAR(100) NOT NULL,
    impact_score DECIMAL(5, 2) NOT NULL,
    impact VARCHAR(50) NOT NULL,
    CONSTRAINT pk_prediction_factor PRIMARY KEY (factor_id),
    CONSTRAINT fk_factor_prediction FOREIGN KEY (prediction_id) 
        REFERENCES prediction(prediction_id) ON DELETE CASCADE,
    INDEX idx_factor_prediction (prediction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. DOCTOR
-- Clinicians and specialist directory
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor (
    doctor_id VARCHAR(64) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_doctor PRIMARY KEY (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. APPOINTMENT (FK: patient_id, doctor_id)
-- Scheduled consultations and clinical visits
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment (
    appointment_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    doctor_id VARCHAR(64) NOT NULL,
    appointment_date DATETIME NOT NULL,
    appointment_type VARCHAR(100) NOT NULL,
    location VARCHAR(150) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    notes TEXT NULL,
    CONSTRAINT pk_appointment PRIMARY KEY (appointment_id),
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctor(doctor_id),
    INDEX idx_appointment_patient (patient_id, appointment_date),
    INDEX idx_appointment_doctor (doctor_id, appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. RECOMMENDATION (1:N with PATIENT)
-- Personalized preventative clinical care plans
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation (
    recommendation_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'Medium',
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    source_type VARCHAR(32) NULL,
    source_id VARCHAR(64) NULL,
    source_label VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_recommendation PRIMARY KEY (recommendation_id),
    CONSTRAINT fk_recommendation_patient FOREIGN KEY (patient_id) 
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_recommendation_patient (patient_id),
    UNIQUE INDEX uq_recommendation_source (patient_id, source_type, source_id, title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. RECOMMENDATION_ACTION (1:N with RECOMMENDATION)
-- Specific actionable clinical steps and lifestyle interventions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_action (
    action_id VARCHAR(64) NOT NULL,
    recommendation_id VARCHAR(64) NOT NULL,
    action_text TEXT NOT NULL,
    target_metric VARCHAR(100) NULL,
    expected_impact VARCHAR(150) NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_recommendation_action PRIMARY KEY (action_id),
    CONSTRAINT fk_action_recommendation FOREIGN KEY (recommendation_id) 
        REFERENCES recommendation(recommendation_id) ON DELETE CASCADE,
    INDEX idx_action_recommendation (recommendation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. LIFESTYLE_LOG (historical patient activity profile entries)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lifestyle_log (
    log_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    physical_activity_days DECIMAL(3, 1) NULL,
    smoking_status VARCHAR(30) NULL,
    CONSTRAINT pk_lifestyle_log PRIMARY KEY (log_id),
    CONSTRAINT fk_lifestyle_log_patient FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id) ON DELETE CASCADE,
    INDEX idx_lifestyle_log_patient_date (patient_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
