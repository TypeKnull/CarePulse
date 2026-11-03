-- Additive, idempotent migration for historical lifestyle entries.
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
